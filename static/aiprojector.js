(function () {
    "use strict";

/* ---8<------------------------- CUSTOMIZE HERE ------------------------->8--- */

    // If true, no requests will be sent to the classifier and
    // a simulation will be run.
    const DEMO_MODE = false;

    const SAMPLING_INTERVAL = 1000; // Milliseconds
    const FRAME_FORMAT = 'image/jpeg';

    /*
       A POST request will be performed to the following endpoint.
       The JSON body will have this format:
      
         { "id": "FRAME ID", "frame": "base64-encoded image" }
      
       The expected response should be a JSON document with this format:
      
         { "label1": P1, "label2": P2, "label3": P3, ... }
      
       where 0 <= Px <= 1.
    */
    const CLASSIFIER_ENDPOINT = 'http://localhost:5000/predict';

    // A label will be considered if its P >= threshold.
    const DEFAULT_THRESHOLD = 0.3;

    /*** Customize UI ***/
    const MAX_FRAMES_IN_ROLL = 15;
    const MAX_SHOWN_PREDICTIONS = 15;
    const HIDE_THRESHOLD_AFTER = 200; // Milliseconds

    /*
       If the camera input source is selected, these are the constraints
       that will be used to decide which video device to use and with which
       settings.
    */
    const VIDEO_DEVICE_CONSTRAINTS = {
        video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 }
        }
    };

    /*** Customize Demo Mode ***/
    const SAMPLE_RESPONSE = {
        cat: 0.3,
        car: 0.4,
        dog: 0.2,
        llama: 0.2,
    };

/* ---8<--------------------- CUSTOMIZATIONS END HERE -------------------->8--- */

    const INPUT_SOURCES = {
        NONE: 'none',
        CAMERA: 'camera',
        VIDEO_SELECTION: 'video_selection',
        VIDEO: 'video'
    };

    let canvas;
    let lastLabeledFrameId = 0;
    let lastUnlabeledFrameId = 0;

    setup();

    function sampleFrame() {
        const inputSourceStatus = getInputSourceStatus();
        if (
            inputSourceStatus.connecting ||
            inputSourceStatus.source === INPUT_SOURCES.NONE
        ) {
            unmarkClassifiedContent();
            showPredictions({});
            return;
        }

        const video = $('video');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        const frameId = Date.now();
        const base64Frame = canvas.toDataURL(FRAME_FORMAT);
        classifyFrame(frameId, base64Frame);
        prependToRoll(frameId, base64Frame);
    }

    function classifyFrame(frameId, frame) {
        if (DEMO_MODE) {
            setTimeout(() => handleClassification(frameId, frame, SAMPLE_RESPONSE), 500);
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

    function handleClassification(frameId, frame, predictions) {
        showPredictions(predictions);

        predictions = getPredictionsOverThreshold(predictions);
        const hasLabels = !isEmpty(predictions);

        const miniature = $(miniatureIdFor(frameId));
        miniature && miniature.classList.add(hasLabels ? 'labeled-miniature' : 'unlabeled-miniature');

        if (hasLabels) {
            if (frameId > lastUnlabeledFrameId) {
                markClassifiedContent();
            }

            if (frameId > lastLabeledFrameId) {
                lastLabeledFrameId = frameId;
            }

            prependToPredictionHistory(frame, predictions);
        } else {
            if (frameId > lastLabeledFrameId) {
                unmarkClassifiedContent();
            }

            if (frameId > lastUnlabeledFrameId) {
                lastUnlabeledFrameId = frameId;
            }
        }
    }

    function getPredictionsOverThreshold(predictions) {
        const threshold = getThreshold();
        return filterKeys(
            predictions,
            (_, value) => value >= threshold,
        );
    }

    function prependToRoll(frameId, frame) {
        const miniature = document.createElement('img');
        miniature.setAttribute('id', miniatureIdFor(frameId));
        miniature.src = frame;

        const framesRoll = $('frames-roll-panel');
        framesRoll.insertBefore(miniature, framesRoll.firstChild);
        if (framesRoll.childElementCount > MAX_FRAMES_IN_ROLL) {
            framesRoll.removeChild(framesRoll.lastChild);
        }
    }

    function prependToPredictionHistory(frame, labels) {
        const history = $('prediction-history');
        const lastFrameInHistory = history.firstChild;

        if (
            lastFrameInHistory &&
                lastFrameInHistory.querySelector('img').src === frame
        ) {
            return;
        }

        const prediction = document.createElement('div');
        prediction.classList.add('prediction');

        const predictionFrame = document.createElement('div');
        predictionFrame.classList.add('prediction-frame');
        const predictionFrameImg = document.createElement('img');
        predictionFrameImg.src = frame;
        predictionFrame.appendChild(predictionFrameImg);

        const predictionLabels = predictionsToHTML(labels);
        predictionLabels.classList.add('prediction-labels');

        prediction.appendChild(predictionFrame);
        prediction.appendChild(predictionLabels);

        history.insertBefore(prediction, lastFrameInHistory);
        if (history.childElementCount > MAX_SHOWN_PREDICTIONS) {
            history.removeChild(history.lastChild);
        }
    }

    function setup() {
        canvas = document.createElement('canvas');

        setupThresholdSlider();

        $('video').addEventListener('playing', () => {
           $('input-source-panel').dataset.connecting = false;
        }, false);

        $('input-sources').addEventListener('click', e => {
            const source = e.target.dataset.source;
            source && setInputSource(source);
        });

        setInterval(sampleFrame, SAMPLING_INTERVAL);
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
            thresholdLabel.appendChild(document.createTextNode(getThreshold().toFixed(2)));
            thresholdLabel.classList.add('visible');
            clearTimeout(hideTresholdLabelTimer);
            hideTresholdLabelTimer = setTimeout(
                () => thresholdLabel.classList.remove('visible'),
                HIDE_THRESHOLD_AFTER
            );
        }, false);
    }
    
    function getThreshold() {
        return $('threshold-slider').value / 100;
    }

    function getInputSourceStatus() {
        const inputSourceData = $('input-source-panel').dataset;
        return {
            source: inputSourceData.source,
            connecting: inputSourceData.connecting === "true"
        };
    }

    function setInputSource(source) {
        const inputSourceData = $('input-source-panel').dataset;
        cancelInputSource(inputSourceData.source);
        inputSourceData.source = source;

        if (source === INPUT_SOURCES.NONE) {
            return;
        }

        inputSourceData.connecting = true;

        switch (source) {
        case INPUT_SOURCES.CAMERA:
            navigator.mediaDevices.getUserMedia(VIDEO_DEVICE_CONSTRAINTS)
                .then(handleVideoStream)
                .catch(e => {
                    console.log(e);
                    inputSourceData.source = INPUT_SOURCES.NONE;
                })
                .finally(() => inputSourceData.connecting = false);
            break;

        case INPUT_SOURCES.VIDEO:
            const video = $('video');
            video.setAttribute('src', getVideoURL());
            video.play()
            break;
        };
    }

    function cancelInputSource(source) {
        switch (source) {
        case INPUT_SOURCES.CAMERA:
            releaseVideoStream();
            break;

        case INPUT_SOURCES.VIDEO:
            const video = $('video');
            video.pause();
            video.removeAttribute('src');
            video.load();
            break;
        };
    }

    function handleVideoStream(stream) {
        $('video').srcObject = stream;
    }

    function releaseVideoStream() {
        const video = $('video');
        video.srcObject &&
            video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = undefined;
    }

    function getVideoURL() {
        return $('video-url').value;
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

    function miniatureIdFor(frameId) {
        return 'miniature-' + frameId;
    }

    function filterKeys(dict, pred) {
        return Object.keys(dict)
            .filter(key => pred(key, dict[key]))
            .reduce((newDict, key) => {
                newDict[key] = dict[key];
                return newDict;
            }, {});
    }

    function isEmpty(dict) {
        for (let k in dict) {
            if (Object.prototype.hasOwnProperty.call(dict, k)) {
                return false;
            }
        }

        return true;
    }

    function showPredictions(predictions) {
        const labels = $('predictions');
        labels.innerHTML = '';
        labels.appendChild(predictionsToHTML(predictions));
    }

    function predictionsToHTML(predictions) {
        const container = document.createElement('div');

        for (let label in predictions) {
            container.appendChild(document.createTextNode(
                label + ' (' + predictions[label].toFixed(2) + ')'
            ));
            container.appendChild(document.createElement('br'));
        }

        return container;
    }
    
    function $(id) {
        return document.getElementById(id);
    }
})();
