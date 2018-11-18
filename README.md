# &#x1F4FD; AI Projector: quick prototyping for your computer vision software

*AI Projector* is a pre-baked UI that helps you quickly prototype computer vision software.

*AI Projector* is simple and web-based. Just download the files in this repository, customize the settings in *aiprojector.js* and you're ready to go.

Watch demo:

[![Watch demo](https://img.youtube.com/vi/x9H-Vwjm_6I/hqdefault.jpg)](https://www.youtube.com/watch?v=x9H-Vwjm_6I)

## Why?
When developing computer vision software, the focus should be on the core of the project, the AI model, not on its UI.

*AI Projector* lets you focus on that. It opens a video stream from your camera or any video you have, samples its frames and send them to your classification model.

Frames that were labeled (i.e. the model returned at least one label with a probability >= threshold), are shown with their labels, and you can easily save them (depending on your browser, right click + save image).

Once your model is ready, you can build your own UI or use AI Projector as a starting point for a web-based UI.

## Sample project based on an early version of AI Projector
![ArkAngel: Sample project based on an early version of AI Projector](https://i1.wp.com/domdefelice.net/wp-content/uploads/2018/10/Screenshot-from-2018-10-22-06-23-33.png "ArkAngel: Sample project based on an early version of AI Projector")

[Read more](https://domdefelice.net/2018/10/22/ai-computer-vision-hackathon/).

## License
*AI projector* is released under the MIT License. You can find a copy of the license in the repository.
