#!/bin/bash
# Start ML Analyzer with virtual environment support

if [ -d "venv" ]; then
    source venv/bin/activate
fi

python app.py

