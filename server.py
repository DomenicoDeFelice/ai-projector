import flask
import flask_cors
import io
import json
import keras
import numpy as np
import tensorflow as tf
import PIL
from base64 import b64decode
from keras.applications import resnet50
from keras.preprocessing import image as keras_image

model = resnet50.ResNet50(weights='imagenet')
tf_graph = tf.get_default_graph()
app = flask.Flask(__name__)
flask_cors.CORS(app)

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if flask.request.method != 'POST':
        return ''

    payload = flask.request.get_json() # Payload sent by the browser
    image_bytes = io.BytesIO(b64decode(payload['image'])) # Image to classify
    
    image = PIL.Image.open(image_bytes)
    image = image.resize((224, 224)) # Resize to be compatible with ResNet50

    x = keras_image.img_to_array(image) # Convert image to a numpy array
    x = np.expand_dims(x, axis=0) # The predictor expects an array of samples, wrap x in an array
    x = resnet50.preprocess_input(x)
    
    with tf_graph.as_default():
        predictions = resnet50.decode_predictions(model.predict(x), top=3)[0]

    return json.dumps({label: p.item() for _, label, p in predictions})

