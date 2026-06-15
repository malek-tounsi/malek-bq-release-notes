import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0
}

def html_to_text(html):
    """Convert HTML snippet to plain text, formatting code tags and links."""
    # Convert code tags to markdown style
    text = re.sub(r'<code>(.*?)</code>', r'`\1`', html)
    # Convert link tags to anchor text only
    text = re.sub(r'<a[^>]*>(.*?)</a>', r'\1', text)
    # Strip all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_entry_content(date, entry_id, link, content_html):
    """Parse HTML content of an Atom entry into discrete updates by <h3> tags."""
    if not content_html:
        return []
    
    # If there are no <h3> tags, treat the entire block as one update of type 'Update'
    if '<h3>' not in content_html:
        text_desc = html_to_text(content_html)
        return [{
            'id': f"{entry_id}_0",
            'date': date,
            'type': 'Update',
            'html': content_html,
            'text': text_desc,
            'link': link
        }]
    
    chunks = re.split(r'<h3>', content_html)
    updates = []
    idx = 0
    for chunk in chunks:
        if not chunk.strip():
            continue
        
        if '</h3>' in chunk:
            parts = chunk.split('</h3>', 1)
            type_str = parts[0].strip()
            desc_html = parts[1].strip()
        else:
            type_str = 'Update'
            desc_html = chunk.strip()
            
        text_desc = html_to_text(desc_html)
        updates.append({
            'id': f"{entry_id}_{idx}",
            'date': date,
            'type': type_str,
            'html': desc_html,
            'text': text_desc,
            'link': link
        })
        idx += 1
    return updates

def get_release_notes(force_refresh=False):
    """Fetch and parse release notes with caching."""
    now = time.time()
    # Cache for 5 minutes (300 seconds) unless forced refresh
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > 300):
        try:
            req = urllib.request.Request(
                FEED_URL, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                xml_data = response.read()
            
            root = ET.fromstring(xml_data)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
            all_updates = []
            for entry in root.findall('atom:entry', ns):
                date_str = entry.find('atom:title', ns).text
                
                # Create a reliable ID from entry id
                id_elem = entry.find('atom:id', ns)
                if id_elem is not None and '#' in id_elem.text:
                    entry_id = id_elem.text.split('#')[-1]
                else:
                    entry_id = re.sub(r'[^a-zA-Z0-9]', '_', date_str)
                    
                link_elem = entry.find("atom:link[@rel='alternate']", ns)
                link = link_elem.attrib.get('href') if link_elem is not None else 'https://cloud.google.com/bigquery/docs/release-notes'
                
                content_elem = entry.find('atom:content', ns)
                content_html = content_elem.text if content_elem is not None else ''
                
                updates = parse_entry_content(date_str, entry_id, link, content_html)
                all_updates.extend(updates)
                
            cache["data"] = all_updates
            cache["last_fetched"] = now
        except Exception as e:
            # Fall back to cache if fetch fails
            if cache["data"]:
                print(f"Fetch failed: {e}. Using cached data.")
                return cache["data"]
            raise e
    return cache["data"]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def api_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes = get_release_notes(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'notes': notes,
            'last_fetched': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"]))
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Using port 5000 by default
    app.run(debug=True, host='0.0.0.0', port=5000)
