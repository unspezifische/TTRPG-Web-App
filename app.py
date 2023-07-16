from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity, decode_token
from flask_socketio import SocketIO, send, emit

import datetime
import os
import csv  ## For importing items from CSV

import logging ## For debug logging
import traceback

db = SQLAlchemy()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '/home/ijohnson/Downloads/Library'
app.config['SECRET_KEY'] = 'secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})

# app.logger.setLevel(logging.DEBUG)
app.logger.setLevel(logging.INFO)  # set the desired logging level
handler = logging.StreamHandler()
handler.setLevel(logging.DEBUG)
app.logger.addHandler(handler)
app.debug = True

socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)
socketio.init_app(app)

jwt = JWTManager(app)
db.init_app(app)

class User(db.Model):
    # __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(100))
    account_type = db.Column(db.String(10))  # 'player' or 'DM'
    character_name = db.Column(db.String(50), nullable=True)  # Only for 'player' accounts
    is_online = db.Column(db.Boolean, default=False) ## Tracks if a user is signed in currently or not
    sid = db.Column(db.String(100), nullable=True)  ## Stores the web socket a user is connected from

    # Relationships
    inventory = db.relationship('InventoryItem', backref='user', lazy=True)
    journal_entries = db.relationship('Journal', backref='user', lazy=True)

class Spell(db.Model):
    __tablename__ = 'spells'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    casting_time = db.Column(db.String(80), nullable=False)
    components = db.Column(db.String(80), nullable=False)
    duration = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text, nullable=False)
    classes = db.Column(db.String(80), nullable=False)
    school = db.Column(db.String(80), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'casting_time': self.casting_time,
            'components': self.components,
            'duration': self.duration,
            'description': self.description,
            'classes': self.classes,
            'school': self.school
        }

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    type = db.Column(db.String(80), nullable=False)
    cost = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(80), nullable=False)
    weight = db.Column(db.Integer)
    description = db.Column(db.String(120))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'cost': self.cost,
            'currency': self.currency,
            'weight': self.weight,
            'description': self.description
        }

class Weapon(db.Model):
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), primary_key=True)
    damage = db.Column(db.String(20), nullable=False)
    weapon_range = db.Column(db.Integer, nullable=False)
    damage_type = db.Column(db.String(20), nullable=False)
    # item = db.relationship('Item', backref='weapon')

    def to_dict(self):
        return {
            'damage': self.damage,
            'weapon_range': self.weapon_range,
            'damage_type': self.damage_type,
        }

class Armor(db.Model):
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), primary_key=True)
    armor_class = db.Column(db.String(20), nullable=False)
    strength_needed = db.Column(db.Integer)
    stealth_disadvantage = db.Column(db.Boolean)

    def to_dict(self):
        return {
            'armor_class': self.armor_class,
            'strength_needed': self.strength_needed,
            'stealth_disadvantage': self.stealth_disadvantage,
        }


class SpellItem(db.Model):
    __tablename__ = 'spell_items'

    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), primary_key=True)
    charges = db.Column(db.Integer)
    spell_id = db.Column(db.Integer, db.ForeignKey('spells.id'), nullable=True)  # Allow spell items without an associated spell


    def to_dict(self):
        return {
            'id': self.id,
            'charges': self.charges,
        }

class MountVehicle(db.Model):
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), primary_key=True)
    speed = db.Column(db.Integer, nullable=False)
    capacity = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            'speed': self.speed,
            'capacity': self.capacity
        }


class InventoryItem(db.Model):
    __tablename__ = 'inventory'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

class Journal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    entry = db.Column(db.Text, nullable=False)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    date_modified = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_ids = db.Column(db.String, nullable=False)  # This would be a comma-separated string of IDs.
    group_id = db.Column(db.String, nullable=False)  # New field: group_id
    message_type = db.Column(db.String(50), nullable=False)  # e.g. 'item_transfer', 'chat', etc.
    message_text = db.Column(db.Text, nullable=False)  # The actual message text.
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)


class NPC(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    ac = db.Column(db.Integer, nullable=False)
    hp = db.Column(db.Integer, nullable=False)
    attack_stats = db.Column(db.String(120), nullable=False)


def set_all_users_offline():
    users = User.query.all()
    for user in users:
        user.is_online = False
    db.session.commit()

with app.app_context():
    db.create_all()
    set_all_users_offline()

## Used to log in a new user
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if 'username' not in data or 'password' not in data:
        return jsonify({'message': 'Username and password are required!'}), 400
    user = User.query.filter_by(username=data['username'].lower()).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Login failed!'}), 401
    access_token = create_access_token(identity=user.username)
    user.is_online = True
    db.session.commit()
    emit_active_users()
    return jsonify({'message': 'Login successful!', 'access_token': access_token, 'character_name': user.character_name})

@app.route('/api/register', methods=['POST'])
def register():
    ## app.logger.info("/api/register: %s", request.json)  # ## app.logger.info the incoming request
    print("/api/register:", request.json)
    data = request.get_json()
    if 'username' not in data or 'password' not in data or 'character_name' not in data or 'account_type' not in data:
        return jsonify({'message': 'Username, password, character name, and account type are required!'}), 400

    # Check if a user with the given username already exists
    existing_user = User.query.filter_by(username=data['username'].lower()).first()
    if existing_user:
        return jsonify({'message': 'A user with this username already exists.'}), 400

    hashed_password = generate_password_hash(data['password'], method='sha256')
    new_user = User(username=data['username'].lower(), password=hashed_password, character_name=data['character_name'], account_type=data['account_type'])
    new_user.is_online = True
    db.session.add(new_user)
    db.session.commit()
    emit_active_users()
    ## app.logger.info(new_user.is_online)   ## For test purposes
    access_token = create_access_token(identity=new_user.username)
    return jsonify({'message': 'Registration successful!', 'access_token': access_token, 'character_name': new_user.character_name})


## Get a specific user profile
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    ## app.logger.info("user: %s", user)
    print("PROFILE- user:", user)
    return jsonify({'username': user.username, 'character_name': user.character_name, 'account_type': user.account_type})

## Returns ALL users, except self
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    current_username = get_jwt_identity()
    users = User.query.filter(User.username != current_username, User.is_online == True).all()
    return jsonify({'users': [user.character_name for user in users]})


## Returns all players, and only players
@app.route('/api/players', methods=['GET'])
@jwt_required()
def get_players():
    players = User.query.filter(User.account_type == 'Player', User.is_online == True).all()
    return jsonify({'players': [{'username': player.username, 'character_name': player.character_name} for player in players]})


@app.route('/api/items', methods=['GET', 'POST'], endpoint='items')
@jwt_required()
def items():
    app.logger.info("api/items- request: %s", request)
    print("api/items- request:", request)
    if request.method == 'GET':
        app.logger.info("FLASK- Getting items for the DM")
        ## Handle GET request for retrieving items (used to populate DM's InventoryView)
        try:
            items = Item.query.all()
            print("ITEMS- items:", items)
            return jsonify({'items': [item.to_dict() for item in items]}), 200

            # item = Item.query.get(item_id)
            #
            # if not item:
            #     return jsonify({'message': 'No item found!'}), 404
            #
            # item_data = item.to_dict()
            #
            # if item.type == 'Weapon':
            #     weapon = Weapon.query.filter_by(item_id=item.id).first()
            #     if weapon:
            #         item_data.update(weapon.to_dict())
            # elif item.type == 'Armor':
            #     armor = Armor.query.filter_by(item_id=item.id).first()
            #     if armor:
            #         item_data.update(armor.to_dict())
            # elif item.type in ['Ring', 'Wand', 'Scroll']:
            #     magic_item = SpellItem.query.filter_by(item_id=item.id).first()
            #     if magic_item:
            #         item_data.update(magic_item.to_dict())
            #
            # return jsonify({'item': item_data}), 200

        except Exception as e:
            app.logger.error(f"Error getting items: {e}")
            return jsonify({'message': 'Server error'}), 500


    elif request.method == 'POST':
        app.logger.info("POST to items- request: %s", request)
        print("POST to items- request:", request)
        data = request.get_json()
        app.logger.info("POST to items- data: %s", data)
        print("POST to items- data:", data)

        name = data.get('name')
        type = data.get('type')
        cost = data.get('cost')
        currency = data.get('currency')
        weight = data.get('weight')  # New field
        description = data.get('description')

        item = Item(name=name, type=type, cost=cost, currency=currency, weight=weight, description=description)
        db.session.add(item)
        db.session.commit()
        try:
            if type == 'Weapon':
                damage = data.get('damage')
                damage_type = data.get('damageType')
                weapon = Weapon(item=item, damage=damage, damage_type=damage_type)
                db.session.add(weapon)
            elif type == 'Armor':
                ac = data.get('ac')
                stealth_disadvantage = data.get('stealth_disadvantage')  # New field
                armor = Armor(item=item, ac=ac, stealth_disadvantage=stealth_disadvantage)
                db.session.add(armor)
            elif type in ['Ring', 'Wand', 'Scroll']:
                spell = data.get('spell')
                charges = data.get('charges')
                magic_item = SpellItem(item=item, spell=spell, charges=charges)
                db.session.add(magic_item)
            elif type == 'MountVehicle':  # Handle MountVehicle items
                speed = data.get('speed')
                capacity = data.get('capacity')
                mount_vehicle = MountVehicle(item=item, speed=speed, capacity=capacity)
                db.session.add(mount_vehicle)
            db.session.commit()

            return jsonify({'item': item.to_dict()}), 201
        except Exception as e:
            app.logger.error(f"Error creating item: {e}")
            print("Error creating item:", e)
            app.logger.error(f"Error occurred: {traceback.format_exc()}")
            print(f"Error occurred: {traceback.format_exc()}")
            return jsonify({'message': 'Error occurred'}), 500  # Update the error message to a generic one



## Update details for an Item entry
@app.route('/api/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    data = request.get_json()
    item = Item.query.get(item_id)
    if not item:
        return jsonify({'message': 'Item not found!'}), 404
    item.name = data.get('name', item.name)
    item.type = data.get('type', item.type)
    item.cost = data.get('cost', item.cost)
    item.currency = data.get('currency', item.currency)
    item.description = data.get('description', item.description)
    db.session.commit()
    return jsonify({'message': 'Item updated!', 'item': item.to_dict()})

## Delete a specific Item entry
@app.route('/api/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({'message': 'Item not found!'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted!'})

## Upload CSV for bulk item creation
@app.route('/api/upload_csv', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return 'No file part', 400
    file = request.files['file']
    csv_data = csv.reader(file.stream)
    items = [row for row in csv_data]
    # now you can emit items back to the client via socketio.emit

## Used to save the newly created (and verified) items
@app.route('/api/save_items', methods=['POST'])
def save_items():
    ## app.logger.info("SAVE CSV- request: %s", request)
    print("SAVE CSV- request", request)
    data = request.get_json()
    ## app.logger.info("SAVE CSV- data: %s", data)
    print("SAVE CSV- data:", data)
    items = data.get('items')
    ## app.logger.info("SAVE CSV- items received: %s", items)
    print("SAVE CSV- items received:", items)
    try:
        ## app.logger.info("SAVE CSV- Recieving items: %s", items)
        print("SAVE CSV- Recieving items:", items)
        for item in items:
            ## app.logger.info("Saving item: %s", item)
            print("Saving item:", item)
            existing_item = Item.query.filter_by(name=item['Name']).first()

            if existing_item is None:
                # Save item to database
                new_item = Item(name=item['Name'], type=item['Type'], cost=item['Cost'], currency=item['Currency'], description=item.get('Description'))
                db.session.add(new_item)
            else:
                ## app.logger.info(f"SAVE CSV- Item {item['Name']} already exists in the database. Skipping...")
                print("SAVE CSV- Item", {item['Name']}, "already exists in the database. Skipping...")

        db.session.commit()

        # Flask server side after new items have been added
        socketio.emit('items_updated')
        return 'Items saved', 200
    except Exception as e:
        return str(e), 400


## Get a player's inventory or add a new item to it
@app.route('/api/inventory', methods=['GET', 'POST'], endpoint='inventory')
@jwt_required()
def inventory():
    ## Get a player's inventory
    if request.method == 'GET':
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        inventory_items = InventoryItem.query.filter_by(user_id=user.id).all()
        inventory = []
        for inventory_item in inventory_items:
            item = Item.query.get(inventory_item.item_id)
            if item is not None:
                item_details = {
                    'id': inventory_item.item_id,
                    'name': inventory_item.name,
                    'type': item.type,
                    'cost': item.cost,
                    'currency': item.currency,
                    'quantity': inventory_item.quantity,
                    'description': item.description
                }

                # Get additional item details based on item type
                if item.type == 'Weapon':
                    weapon = Weapon.query.get(item.id)
                    if weapon is not None:
                        item_details.update({
                            'damage': weapon.damage,
                            'damage_type': weapon.damage_type,
                            'properties': weapon.properties
                        })
                elif item.type == 'Armor':
                    armor = Armor.query.get(item.id)
                    if armor is not None:
                        item_details.update({
                            'ac': armor.ac
                        })
                # Add more elif conditions here for other item types

                inventory.append(item_details)

        ## app.logger.info("GET INVENTORY- inventory: %s", inventory)
        print("GET INVENTORY- inventory:", inventory)
        return jsonify({'inventory': inventory})

    ## Add Item to player inventory
    elif request.method == 'POST':
        ## app.logger.info("**** Giving Item to Player ****")
        print("**** Giving Item to Player ****")
        data = request.get_json()
        ## app.logger.info("POST INVENTORY- data: %s", data)
        print("POST INVENTORY- data:", data)

        ## Verify that the DM is issuing the item
        current_user = User.query.filter_by(username=get_jwt_identity()).first()
        if 'character_name' in data and current_user.account_type != 'DM':
            return jsonify({'message': 'Only DMs can issue items to other players!'}), 403
        username = data['username']

        user = User.query.filter_by(username=username).first()
        ## app.logger.info("FLASK- player: %s", user.username)
        print("FLASK- player:", user.username)
        if user is None:
            return jsonify({'message': 'User not found'}), 404

        item = Item.query.get(data['item_id'])
        ## app.logger.info("FLASK- item: %s", item.name)
        print("FLASK- item:", item.name)
        if item is None:
            return jsonify({'message': 'Item not found'}), 404

        inventory_item = InventoryItem.query.filter_by(user_id=user.id, item_id=item.id).first()
        if inventory_item:
            inventory_item.quantity += int(data['quantity'])
        else:
            inventory_item = InventoryItem(user_id=user.id, item_id=item.id, quantity=data['quantity'])
            db.session.add(inventory_item)
        db.session.commit()

        # Emit a WebSocket event to the client
        ## app.logger.info("FLASK- Emitting inventory update")
        print("FLASK- Emitting inventory update")
        socketio.emit('inventory_update', {'character_name': user.character_name, 'item_id': data['item_id'], 'quantity': data['quantity']}, to=user.sid)

        return jsonify({'message': 'Item added to inventory!'})

## When a player wants to remove an item from their inventory
@app.route('/api/inventory/<int:item_id>', methods=['DELETE'])
@jwt_required()
def drop_item(item_id):
    ## app.logger.info("Dropping item", item_id)
    print("Dropping item", item_id)
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    ## app.logger.info("user: %s", user)
    print("user:", user)
    inventory_item = InventoryItem.query.filter_by(user_id=user.id, item_id=item_id).first()
    # inventory_item = InventoryItem.query.get(inventory_item_id)
    ## app.logger.info("inventory_item: %s", inventory_item)
    print("inventory_item:", inventory_item)
    if not inventory_item:
        return jsonify({'message': 'Item not found in inventory!'}), 404

    drop_quantity = request.get_json().get('quantity', 1)

    drop_quantity = int(drop_quantity)
    if inventory_item.quantity > drop_quantity:
        inventory_item.quantity -= drop_quantity
    else:
        db.session.delete(inventory_item)
    db.session.commit()
    return jsonify({'message': 'Item dropped!'})


## These functions do Journal stuff
@app.route('/api/journal', methods=['POST'])
@jwt_required()
def create_journal_entry():
    data = request.get_json()
    if 'title' not in data or 'entry' not in data:
        return jsonify({'message': 'Title and Entry are required!'}), 400

    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()

    new_journal_entry = Journal(
        user_id=user.id,
        title=data['title'],
        entry=data['entry'],
        date_created=datetime.datetime.utcnow(),
        date_modified=datetime.datetime.utcnow()
    )
    db.session.add(new_journal_entry)
    db.session.commit()

    return jsonify({'message': 'New journal entry created!'})

@app.route('/api/journal', methods=['GET'])
@jwt_required()
def get_journal_entries():
    print("**** GETTING JOURNAL ENTRIES ****")
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    entries = Journal.query.filter_by(user_id=user.id).order_by(Journal.date_created.desc()).all()
    ## app.logger.info("GET JOURNAL ENTRY- entries: %s", entries)
    print("GET JOURNAL ENTRY- entries:", entries)
    return jsonify({'entries': [{
        'id': entry.id,
        'title': entry.title,
        'date_created': entry.date_created.strftime("%m/%d/%Y, %H:%M:%S"),
        'date_modified': entry.date_modified.strftime("%m/%d/%Y, %H:%M:%S"),
        'content': entry.entry
    } for entry in entries]})

@app.route('/api/journal/<entry_id>', methods=['DELETE'])
@jwt_required()
def delete_journal_entry(entry_id):
    ## app.logger.info("DELETE JOURNAL ENTRY- entry_id: %s", entry_id)
    print("DELETE JOURNAL ENTRY- entry_id:", entry_id)
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    ## app.logger.info("DELETE JOURNAL ENTRY- user: %s", user)
    print("DELETE JOURNAL ENTRY- user:", user)
    entry = Journal.query.filter_by(id=entry_id, user_id=user.id).first()
    ## app.logger.info("DELETE JOURNAL ENTRY- entry: %s", entry)
    print("DELETE JOURNAL ENTRY- entry:", entry)

    if entry is None:
        return jsonify({'message': 'Journal entry not found'}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Journal entry deleted'}), 200


## Handles the Library stuff
@app.route('/api/library', methods=['GET', 'POST'])
def library():
    if request.method == 'GET':
        # Return the list of files
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        file_info = []
        for file in files:
            fileName, fileType = os.path.splitext(file)
            displayName = fileName.replace("_", " ")
            file_info.append({'name': displayName, 'type': fileType[1:], 'originalName': file})  # fileType[1:] to remove the leading dot
        return { 'files': file_info }

    elif request.method == 'POST':
        # Save the uploaded file
        file = request.files['file']
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return { 'file': { 'name': filename } }

@app.route('/api/library/<filename>')
def get_file(filename):
    # Send the requested file
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


##************************##
## **  SocketIO Stuff  ** ##
##************************##

def emit_active_users():
    ## app.logger.info("FLASK- Emitting Active Users")
    print("FLASK- Emitting Active Users")
    active_users = User.query.filter_by(is_online=True).all()
    active_usernames = [user.character_name for user in active_users]
    ## app.logger.info("FLASK- active_usernames: %s", active_usernames)
    print("FLASK- active_usernames:", active_usernames)
    socketio.emit('active_users', active_usernames)

@socketio.on("connect")
def connected():
    """event listener when client connects to the server"""
    ## app.logger.info("CONNECT- New Socket Connection")
    try:
        token = request.args.get('token')  # Get the token from the request arguments
        if token:
            user = User.query.filter_by(username=request.args.get("username")).first()
            ## app.logger.info("CONNECT- user: %s", user)
            print("CONNECT- user:", user)
            if user:
                ## app.logger.info("CONNECT- setting %s to online", user)
                print("CONNECT- setting", user, "to online")
                user.is_online = True
                user.sid = request.sid  # Update the SID associated with this user
                db.session.commit()
                emit_active_users()
    except jwt.ExpiredSignatureError:
        # emit a custom event to notify client about the expired token
        socketio.emit('token_expired')
        ## app.logger.info("CONNECT- token is expired")


@socketio.on('user_connected')
def handle_user_connected(data):
    # ## app.logger.info("HANDLE CONNETION- user_connected- data: %s", data)
    ## app.logger.info('HANDLE CONNETION- User connected: %s', data['username'])
    print('HANDLE CONNETION- User connected:', data['username'])
    # You can now associate the username with the current socket connection
    user = User.query.filter_by(username=data['username']).first()
    if user:
        ## app.logger.info("HANDLE CONNETION- user status: %s", user.is_online)
        print("HANDLE CONNETION- user status:", user.is_online)
        if not user.is_online:
            user.is_online = True
            user.sid = request.sid  # Set the sid field
            db.session.commit()
            emit_active_users()
        else:
            user.sid = request.sid  # Set the sid field
            db.session.commit()
            emit_active_users()
            ## app.logger.info("HANDLE CONNETION- %s is already online", user.username)
            print("HANDLE CONNETION-", user.username, "is already online")


@socketio.on('sendMessage')
def handle_send_message(messageObj):
    ## app.logger.info("MESSAGE- messageObj: %s", messageObj)
    print("MESSAGE- messageObj:", messageObj)
    message = messageObj['text']
    sender_characterName = messageObj['sender']
    recipient_list = messageObj['recipients']
    ## app.logger.info("MESSAGE- recipient_list: %s", recipient_list)
    print("MESSAGE- recipient_list:", recipient_list)

    for recipient in recipient_list:
        # Query for the recipient user
        recipient_user = User.query.filter_by(character_name=recipient).first()
        ## app.logger.info("MESSAGE- recipient_user: %s", recipient_user)
        print("MESSAGE- recipient_user:", recipient_user)
        if recipient_user:
            recipient_sid = recipient_user.sid
            socketio.emit('message', messageObj, to=recipient_sid)
        else:
            ## app.logger.info(f"MESSAGE- No user found with character name {recipient}")
            print("MESSAGE- No user found with character name", recipient)

    # Get recipient users first, this will allow you to filter out any invalid usernames
    recipient_users = [User.query.filter_by(character_name=recipient).first() for recipient in recipient_list]

    # Filter out None values (invalid usernames)
    recipient_users = [user for user in recipient_users if user is not None]

    # Now create recipient_ids
    recipient_ids = ",".join(str(user.id) for user in recipient_users)

    # Get the sender's ID as well
    sender_user = User.query.filter_by(character_name=sender_characterName).first()
    ## app.logger.info("MESSAGE- sender_user: %s", sender_user)
    print("MESSAGE- sender_user:", sender_user)

    # Compute the group ID
    group_id = "-".join(sorted([str(sender_user.id)] + recipient_ids.split(",")))
    ## app.logger.info("MESSAGE- group_id: %s", group_id)
    print("MESSAGE- group_id:", group_id)

    new_message = Message(sender_id=sender_user.id, recipient_ids=recipient_ids, message_type=messageObj['type'], message_text=messageObj['text'], group_id=group_id)

    db.session.add(new_message)

    try:
        db.session.commit()  # Always commit changes to the DB
        ## app.logger.info("MESSAGE- You've been committed!")
        print("MESSAGE- You've been committed!")
    except Exception as e:
        ## app.logger.info("MESSAGE- An error occurred while committing to the database: %s", str(e))
        print("MESSAGE- An error occurred while committing to the database:", str(e))
        db.session.rollback()  # Rollback the changes on error


    if messageObj['type'] == 'item_transfer':
        # Handle the item transfer here
        item = messageObj['item']
        quantity = item['quantity']

        # Here we assume that the recipient_list only contains one recipient for an item_transfer
        recipient = recipient_list[0]
        ## app.logger.info("MESSAGE- ITEM TRANSFER- Giving item to %s", recipient)
        print("MESSAGE- ITEM TRANSFER- Giving item to", recipient)

        ## Query for recipient user
        recipient_user = User.query.filter_by(username=recipient).first()
        ## app.logger.info("MESSAGE- ITEM TRANSFER- recipient_user: %s", recipient_user)
        print("MESSAGE- ITEM TRANSFER- recipient_user:", recipient_user)

        # Update recipient's inventory here
        if recipient_user is None:
            return jsonify({'message': 'User not found'}), 404

        # Query for the sender user
        ## app.logger.info("MESSAGE- ITEM TRANSFER- sender_characterName: %s", sender_characterName)
        print("MESSAGE- ITEM TRANSFER- sender_characterName:", sender_characterName)


        db_item = Item.query.get(item['id'])
        ## app.logger.info("MESSAGE- item: %s", db_item.name)
        print("MESSAGE- item:", db_item.name)
        if db_item is None:
            return jsonify({'message': 'Item not found'}), 404

        # Update recipient's inventory
        recipient_inventory_item = InventoryItem.query.filter_by(user_id=recipient_user.id, item_id=db_item.id).first()

        if recipient_inventory_item:
            recipient_inventory_item.quantity += int(quantity)

        else:
            new_inventory_item = InventoryItem(user_id=recipient_user.id, item_id=db_item.id, name=db_item.name, quantity=int(quantity))
            db.session.add(new_inventory_item)
            db.session.commit()

        # Emit an inventory_update event to the recipient
        socketio.emit('inventory_update', {'character_name': recipient_user.character_name, 'item': item}, room=recipient_user.sid)

        # Send a message to the recipient that they got a new item
        reception_message = {
            'type': 'text',
            'text': f'{recipient_user.character_name} gave you {quantity} {db_item.name}'
        }
        socketio.emit('message', reception_message, to=recipient_user.sid)

        # Update sender's inventory only if the sender is not a DM
        if sender_user.account_type != 'DM':
            sender_inventory_item = InventoryItem.query.filter_by(user_id=sender_user.id, item_id=db_item.id).first()
            if sender_inventory_item and sender_inventory_item.quantity > int(quantity):
                sender_inventory_item.quantity -= int(quantity)
            elif sender_inventory_item.quantity == int(quantity):
                db.session.delete(sender_inventory_item)
            else:
                return jsonify({'message': 'Not enough quantity in inventory'}), 400

            db.session.commit()

            # Emit an inventory_update event to the sender
            socketio.emit('inventory_update', {'character_name': sender_characterName, 'item': item}, to=sender_user.sid)

        # After updating the sender's inventory, send a confirmation message to the DM.
        confirmation_message = {
            'type': 'text',
            'text': f'You gave {recipient_user.character_name} {quantity} {db_item.name}'
        }
        socketio.emit('message', confirmation_message, to=sender_user.sid)


@socketio.on('disconnect')
def disconnected():
    """event listener when client disconnects to the server"""
    ## app.logger.info("DISCONNECT- request.sid: %s", request.sid)
    print("DISCONNECT- request.sid:", request.sid)
    user = User.query.filter_by(sid=request.sid).first()
    if user:
        ## app.logger.info("DISCONNECT- %s is logging off!", user.username)
        print("DISCONNECT-", user.username, "is logging off!")
        user.is_online = False
        db.session.commit()
        emit_active_users()
        socketio.emit("disconnect",f"user {user.username} disconnected", room='/')
        ## app.logger.info("DISCONNECT- %s disconnected", user.username)
        print("DISCONNECT-", user.username, "disconnected")


if __name__ == '__main__':
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler
    socketio.run(app, host='0.0.0.0', port=5000)
