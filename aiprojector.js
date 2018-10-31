(function (global) {

/* ---8<------------------------- CUSTOMIZE HERE ------------------------->8--- */

    // If true, no requests will be sent to the classifier and
    // a simulation will be run.
    const DEMO_MODE = true;

    const SAMPLING_INTERVAL = 1000; // Milliseconds
    const FRAME_FORMAT = 'image/jpeg';

    // A POST request will be performed to the following endpoint.
    // The JSON body will have this format:
    //
    // { "id": "FRAME ID", "frame": "base64-encoded image" }
    //
    // The expected response should be a JSON document with this format:
    //
    // { "label1": P1, "label2": P2, "label3": P3, ... }
    //
    // where 0 <= Px <= 1.
    const CLASSIFIER_ENDPOINT = 'http://localhost:5000/predict';

    // A label will be considered if its P >= threshold.
    const DEFAULT_THRESHOLD = 0.5;

    const VIDEO_DEVICE_CONSTRAINTS = {
        video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 }
        }
    };

    /*** Customize UI ***/
    const MAX_FRAMES_IN_ROLL = 15;
    const MAX_SHOWN_PREDICTIONS = 15;
    const HIDE_THRESHOLD_AFTER = 200; // Milliseconds

    /*** Customize Demo Mode ***/
    const SAMPLE_RESPONSE = {
        cat: 0.3,
        car: 0.4,
        dog: 0.2,
        llama: 0.2,
    };

/* ---8<--------------------- CUSTOMIZATIONS END HERE -------------------->8--- */

    let canvas;
    let lastLabeledFrameId = 0;
    let lastUnlabeledFrameId = 0;

    setupThresholdSlider();

    navigator.mediaDevices.getUserMedia(VIDEO_DEVICE_CONSTRAINTS)
        .then(stream => {
            const appRoot = $('app-root');
            appRoot.classList.remove('loading');
            appRoot.classList.add('projecting');
            handleStream(stream);
        })
        .catch(e => {
            console.log(e);

            const appRoot = $('app-root');
            appRoot.classList.remove('loading');
            appRoot.textContent = 'A video device is required';
        });

    function handleStream(stream) {
        const video = $('video');
        show(video);
        video.srcObject = stream;

        setupCanvas();

        global.setInterval(sampleFrame, SAMPLING_INTERVAL);
    }

    function sampleFrame() {
        canvas.getContext('2d').drawImage($('video'), 0, 0);

        const frameId = Date.now();
        const base64Frame = canvas.toDataURL(FRAME_FORMAT);
        classifyFrame(frameId, base64Frame);
        prependToRoll(frameId, base64Frame);
    }

    function classifyFrame(frameId, frame) {
        if (DEMO_MODE) {
            global.setTimeout(() => handleClassification(frameId, frame, SAMPLE_RESPONSE), 500);
            return;
        }

        const prefix = 'data:' + FRAME_FORMAT + ';base64,';
        const base64Frame = frame.slice(prefix.length);

        fetch(CLASSIFIER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({image: base64Frame})
        })
            .then(res => res.json())
            .then(res => handleClassification(frameId, frame, res));
    }

    function handleClassification(frameId, frame, prediction) {
        const labels = getLabelsFromPrediction(prediction);
        const hasLabels = labels.length > 0;

        const miniature = $(miniatureIdFor(frameId));
        miniature && miniature.classList.add(hasLabels ? 'labeled-miniature' : 'unlabeled-miniature');

        if (hasLabels) {
            if (frameId > lastUnlabeledFrameId) {
                markClassifiedContent();
            }

            if (frameId > lastLabeledFrameId) {
                lastLabeledFrameId = frameId;
            }

            prependToPredictions(frame, labels);
        } else {
            if (frameId > lastLabeledFrameId) {
                unmarkClassifiedContent();
            }

            if (frameId > lastUnlabeledFrameId) {
                lastUnlabeledFrameId = frameId;
            }
        }
    }

    function getLabelsFromPrediction(prediction) {
        const threshold = getThreshold();
        return Object.keys(prediction).filter(k => prediction[k] >= threshold);
    }

    function prependToRoll(frameId, frame) {
        const miniature = document.createElement('img');
        miniature.setAttribute('id', miniatureIdFor(frameId));
        miniature.src = frame;

        const framesRoll = $('frames-roll');
        framesRoll.insertBefore(miniature, framesRoll.firstChild);
        if (framesRoll.childElementCount > MAX_FRAMES_IN_ROLL) {
            framesRoll.removeChild(framesRoll.lastChild);
        }
    }

    function prependToPredictions(frame, labels) {
        const prediction = document.createElement('div');
        prediction.classList.add('prediction');

        const predictionFrame = document.createElement('div');
        predictionFrame.classList.add('prediction-frame');
        const predictionFrameImg = document.createElement('img');
        predictionFrameImg.src = frame;
        predictionFrame.appendChild(predictionFrameImg);

        const predictionLabels = document.createElement('div');
        predictionLabels.classList.add('prediction-labels');
        for (let i = 0; i < labels.length; i++) {
            predictionLabels.appendChild(document.createTextNode(labels[i]));
            predictionLabels.appendChild(document.createElement('br'));
        }

        prediction.appendChild(predictionFrame);
        prediction.appendChild(predictionLabels);
        
        const predictions = $('predictions');
        predictions.insertBefore(prediction, predictions.firstChild);
        if (predictions.childElementCount > MAX_SHOWN_PREDICTIONS) {
            predictions.removeChild(predictions.lastChild);
        }
    }

    function setupCanvas() {
        canvas = document.createElement('canvas');
        global.setTimeout(() => {
            const video = $('video');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }, 500);
    }

    function setupThresholdSlider() {
        const thresholdSlider = $('threshold-slider');
        thresholdSlider.value = DEFAULT_THRESHOLD * 100;

        let hideTresholdLabelTimer = 0;
        thresholdSlider.addEventListener('input', () => {
            const thresholdLabel = $('threshold-label');
            thresholdLabel.textContent = '';
            thresholdLabel.appendChild(document.createTextNode('Threshold'));
            thresholdLabel.appendChild(document.createElement('br'));
            thresholdLabel.appendChild(document.createTextNode(getThreshold()));
            thresholdLabel.classList.add('visible');
            global.clearTimeout(hideTresholdLabelTimer);
            hideTresholdLabelTimer = global.setTimeout(
                () => thresholdLabel.classList.remove('visible'),
                HIDE_THRESHOLD_AFTER
            );
        }, false);
    }
    
    function getThreshold() {
        return $('threshold-slider').value / 100;
    }

    function miniatureIdFor(frameId) {
        return 'miniature-' + frameId;
    }

    function markClassifiedContent() {
        const videoRoot = $('video-root');
        videoRoot.classList.remove('unclassified');
        videoRoot.classList.add('classified');
    }

    function unmarkClassifiedContent() {
        const videoRoot = $('video-root');
        videoRoot.classList.remove('classified');
        videoRoot.classList.add('unclassified');
    }

    function show(el) {
        el.classList.remove('hidden');
    }

    function $(id) {
        return document.getElementById(id);
    }
})(window);
