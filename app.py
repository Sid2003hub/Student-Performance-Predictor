from api.index import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(__import__("os").getenv("PORT", "5000")), debug=__import__("os").getenv("APP_DEBUG") == "true")
