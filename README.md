# BigQuery Release Pulse

An elegant, real-time portal built with Python Flask and plain vanilla HTML, JS, and CSS. The app fetches Google Cloud BigQuery Release Notes, presents them in a gorgeous glassmorphic dashboard, and enables users to customize, preview, and share updates directly to X (formerly Twitter).

---

## 🚀 Key Features

*   **Real-time Atom Feed Integration**: Fetches and parses the official Google Cloud BigQuery release notes XML feed dynamically.
*   **Intelligent Update Chunking**: Automatically breaks down combined daily feed updates into distinct, category-tagged items (Features, Changes, Announcements, and General Updates).
*   **High-End Glassmorphic UI**: A dark mode interface featuring neon ambient glows, backdrop filters, and micro-animations.
*   **Live Tweet Composer & Mockup**: Allows users to customize update text, track character limits with an interactive progress ring, view a live-updating mockup of how their post will appear on X, and share it with a single click.
*   **Local Search & Category Filters**: Responsive client-side filtering by keywords, dates, or update categories.
*   **Utility Actions**: Copy update text with a single click, supported by a slide-in toast notification system.
*   **UX Enhancements**: Integrated loading skeleton cards for smooth loading transitions and a fully responsive mobile layout.

---

## 🛠️ Tech Stack

*   **Backend**: Python 3.11+ / Flask
*   **Frontend**: Plain HTML5, CSS3 (Vanilla), and JavaScript (ES6+)
*   **Icons**: FontAwesome 6.4 (via CDN)
*   **Fonts**: Outfit & Plus Jakarta Sans (via Google Fonts)

---

## 📁 Project Structure

```text
bq-releases-notes/
├── app.py                 # Flask server & XML parsing engine
├── templates/
│   └── index.html         # Main dashboard markup & modal structure
├── static/
│   ├── css/
│   │   └── style.css      # Core styles, animations & theme tokens
│   └── js/
│       └── app.js         # Client-side state, API calls, filters & modals
├── .gitignore             # Git exclusion rules
└── README.md              # Project documentation
```

---

## ⚙️ Getting Started

### 1. Prerequisites
Make sure you have **Python 3.11+** installed on your system.

### 2. Installation
Clone this repository locally, navigate to the directory, and install the Flask dependency:
```bash
python -m pip install Flask
```

### 3. Running the Server
Start the Flask development server:
```bash
python app.py
```

By default, the server runs in debug mode on port 5000. Access it at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔌 API Endpoints

### `GET /api/notes`
Fetches and returns the parsed BigQuery release notes.
*   **Query Parameters**:
    *   `refresh` (optional): Set to `true` to force a cache reload from Google's servers. E.g., `/api/notes?refresh=true`.
*   **Response Format**:
    ```json
    {
      "success": true,
      "notes": [
        {
          "id": "June_12_2026_0",
          "date": "June 12, 2026",
          "type": "Feature",
          "html": "<p>BigQuery AI functions can use ObjectRef values...</p>",
          "text": "BigQuery AI functions can use ObjectRef values directly as input...",
          "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_12_2026"
        }
      ],
      "last_fetched": "2026-06-15 13:55:12"
    }
    ```

---

## 🛡️ License

This project is open-source and available under the MIT License.
