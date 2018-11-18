#!/bin/sh
export FLASK_APP=server.py
flask run --port=5000 --with-threads
