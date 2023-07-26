# TTRPG-Web-App
React-based Web App for Inventory Management of D&amp;D campaigns.

## Install and Setup React
1. Run `sudo apt update && sudo apt upgrade` if you haven't recently, to ensure all your system packages are up to date.
2. Run `sudo apt install nodejs` to actually install NodeJS. After that has finished, running `node -v` to verify that the installation was successful. That will list out the version of NodeJS that is installed. There is a minimum version requirement for the next command to work.
3. In the directory where you want to house your files, run `npx create-react-app my-app`. The `my-app` part will be the name of the directory that gets created, and will house all your project files.
4. Now that the folder for the React part of the project is set up, you can copy over all the files in the `src` folder of this project. THIS REPO DOES NOT CONTAIN THE FULL REACT DIRECTORY! You WILL have to create your own, then copy the supplied files into that folder. There are extra files that a React directory requires in order to function and build properly.
5. `npm install react-bootstrap bootstrap react-router-dom axios socket.io-client jwt-decode leaflet react-leaflet @geoman-io/leaflet-geoman-free react-grid-layout @mui/icons-material @mui/material @emotion/styled @emotion/react papaparse draft-js react-dnd react-dnd-html5-backend draft-js-checkable-list-item @trendmicro/react-sidenav react-spring @turf/turf draft-js-list-plugin --legacy-peer-deps` This one needs to be replaced or updated or something. It isn't compatible with the latest React version.
6. These are used for the map feature: `npm i socket.io-client react-router-dom leaflet react-leaflet react-bootstrap axios @geoman-io/leaflet-geoman-free`

## Install and Setup Python/Flask
1. Now to setup the backend functions. First you'll need to ensure Python3 is installed. This is done by defualt on Raspberry Pi OS. To ensure it is installed, you can run `which python3`. If you get a response, you have Python3 installed. It should be installed by default on Raspberry Pi OS and also Ubuntu Server.
2. Before installing the rest of the Python packages, we will need to install Flask using `sudo apt install python3-flask`. This will allow us to use `flask run` to run the server backend later.
3. Ensure you have Python's package manager installed. If you do not, install it using `sudo apt install python3-pip`
4. Now you can use Python's package manager to install the additional packages we need for this project:
`pip install flask
pip install flask_sqlalchemy
pip install werkzeug
pip install flask_cors
pip install flask_jwt_extended
pip install flask_socketio
pip install celery
pip install shapely
pip install geojson
pip install opencv-python
pip install numpy`
Or in one line: `pip install flask flask_sqlalchemy werkzeug flask_cors flask_jwt_extended flask_socketio`

## Configure Server
6. This project was created to use Nginx as the server, but could probably be adapted to use Apache2. Install Nginx on your system using `sudo apt install nginx`. Then use `sudo mv nginx.conf /etc/nginx/conf.d/nginx.conf` to place the config file in the right place for Nginx to use it.
7. After copying the config file into the right directroy, run `sudo nginx -t` to verify the syntax of the file. Some systems might require different header setup, so you may need to remove the `user`, `events`, and `http` lines, but leave the 3 `server` lines because those are important! Just follow the feedback from `sudo nginx -t` until it compiles without issue. REMEMBER TO CHANGE THE LINES THAT BEGIN WITH `server_name` TO YOUR SERVER'S NAME, if you aren't running this on a Raspberry Pi named "raspberrypi". Also update your username in the line `root` under the `location /` block to your own username.
8. If your system uses Systemctl, you can run `sudo systemctl restart nginx`, otherwise use `sudo service nginx restart` to restart the server.

Probably need to setup DNS to find `wiki` and `app` domains at your `hostname.local`. And `maps`?

## Getting it all up and running
1. Now you can naviage to your `my-app` directory, if you aren't already there, and use `npm run build` to build the React pages into a static deliverable that Nginx will be able to serve up. This will create a new directroy in `my-app` called `build`, which Nginx should already be configured to use.

