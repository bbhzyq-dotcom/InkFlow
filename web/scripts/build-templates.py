#!/usr/bin/env python3
"""Build script to render Jinja2 templates to static HTML."""

import os
import sys
from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = 'templates'
OUTPUT_DIR = 'static'

def main():
    templates_dir = os.path.join(os.path.dirname(__file__), '..', TEMPLATES_DIR)
    output_dir = os.path.join(os.path.dirname(__file__), '..', OUTPUT_DIR)
    
    os.makedirs(output_dir, exist_ok=True)
    
    env = Environment(
        loader=FileSystemLoader(templates_dir),
        autoescape=select_autoescape(['html', 'xml'])
    )
    
    template = env.get_template('index.html')
    rendered = template.render()
    
    output_path = os.path.join(output_dir, 'index.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(rendered)
    
    print(f"Template rendered successfully: {output_path}")

if __name__ == '__main__':
    main()
