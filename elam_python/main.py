from app import create_app
from app.seed import seed_database
import os

app = create_app()

if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(__file__), "elam.db")
    if not os.path.exists(db_file):
        seed_database()

    print("==================================================")
    print("SERVEUR ELAM SANTE GABON (PYTHON / FLASK ACTIF)")
    print("Application Web & Mobile : http://localhost:8000")
    print("Conception medicale pure sans emojis")
    print("==================================================")
    app.run(host="0.0.0.0", port=8000, debug=True)
