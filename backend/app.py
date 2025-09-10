from flask import Flask, send_from_directory,jsonify
import os


# Flask sirve archivos estáticos desde ./build (lo genera Vite)
app = Flask(__name__, static_folder="build", static_url_path="/")

# Home (sirve index.html del build)
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/health")
def health():
    return jsonify(status="ok")

# Soporte para rutas del SPA (React Router): cualquier 404 vuelve al index
@app.errorhandler(404)
def spa_fallback(e):
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, "index.html")
    return {"error": "not found"}, 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
