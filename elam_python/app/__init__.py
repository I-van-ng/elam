import os
from flask import Flask
from .database import engine, Base
from .routes import web_bp


def create_app():
    templates_dir = os.path.join(os.path.dirname(__file__), "templates")
    app = Flask(__name__, template_folder=templates_dir)

    # Initialize tables
    Base.metadata.create_all(bind=engine)

    # Register blueprints
    app.register_blueprint(web_bp)

    return app
