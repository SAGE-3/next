from flask import Flask, jsonify, request
import json

app = Flask(__name__)

@app.route('/ai', methods=['POST'])
def ai():
    return json.dumps({"status": "SUCCESS"})