import React, { useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';  // Makes API calls
import Papa from 'papaparse'; // parses CSV file
import { Container, Row, Col, Table, Button, Modal, ModalDialog, Form } from 'react-bootstrap';

// For making the table adjustable
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import UserContext from './UserContext';

import SortIcon from '@mui/icons-material/Sort';
import EditIcon from '@mui/icons-material/Edit';

import 'bootstrap/dist/css/bootstrap.min.css';

export default function InventoryView({ username, characterName, accountType, headers, socket, isLoading, setIsLoading }) {
  // const { username, characterName, accountType, headers, socket, isLoading, setIsLoading } = useContext(UserContext);
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null); // Stores the file
  const [addingItems, setAddingItems] = useState(false);  // Used for adding mutliple items from a CSV file
  const [uploadedItems, setUploadedItems] = useState([]);
  const [fieldName, setFieldName] = useState([]); // Maybe?
  const [creatingItem, setCreatingItem] = useState(false);  // Used for creating a single item at a time

  // Fields for defining a new item
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemCurrency, setNewItemCurrency] = useState('Gold');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemWeight, setNewItemWeight] = useState();

  const [newItemDamage, setNewItemDamage] = useState('');
  const [newItemDamageType, setNewItemDamageType] = useState('');
  const [newItemAC, setNewItemAC] = useState('');
  const [newItemStealthDisadvantage, setNewItemStealthDisadvantage] = useState(false);

  const [newItemSpeed, setNewItemSpeed] = useState();
  const [newItemCapacity, setNewItemCapacity] = useState();

  const [newItemSpell, setNewItemSpell] = useState('');
  const [newItemCharges, setNewItemCharges] = useState('');


  const [showViewItemDetails, setShowViewItemDetails] = useState(false);
  const [showEditItemDetails, setShowEditItemDetails] = useState(false);
  const [selectedItemWeight, setSelectedItemWeight] = useState();
  const [selectedItemType, setSelectedItemType] = useState();
  const [selectedItemSpeed, setSelectedItemSpeed] = useState();
  const [selectedItemCapacity, setSelectedItemCapacity] = useState();
  const [selectedItemStealthDisadvantage, setSelectedItemStealthDisadvantage] = useState(false);


  const currencyValues = {
    'Copper': 1,
    'Silver': 10, // 1 Silver is worth 10 Copper
    'Electrum': 50, // 1 Electrum is worth 50 Copper
    'Gold': 100, // 1 Gold is worth 100 Copper
    'Platinum': 1000, // 1 Platinum is worth 1000 Copper
  };

  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(' ');
  const [quantity, setQuantity] = useState(1);

  const [dropQuantity, setDropQuantity] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');

  /* Sorting Functionality */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [sortedInventory, setSortedInventory] = useState([]);

  const onSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        direction = null;
        key = null;
      }
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    let newSortedInventory = [...inventory];
    if (sortConfig.key !== null && sortConfig.direction !== null) {
      newSortedInventory.sort((a, b) => {
        if (sortConfig.key === "value") {
          const aValueInCopper = a.quantity * a.cost * currencyValues[a.currency];
          const bValueInCopper = b.quantity * b.cost * currencyValues[b.currency];

          if (aValueInCopper < bValueInCopper) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValueInCopper > bValueInCopper) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        } else if (sortConfig.key === "cost") {
          const aValueInCopper = a.cost * currencyValues[a.currency];
          const bValueInCopper = b.cost * currencyValues[b.currency];

          if (aValueInCopper < bValueInCopper) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValueInCopper > bValueInCopper) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        } else {
          // Handle sorting for other keys normally
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        }
        return 0;
      });
    }
    setSortedInventory(newSortedInventory);
  }, [sortConfig, inventory]);


  // Only used to populate the inventory table (for player or DM)
  useEffect(() => {
    console.log("INVENTORY- isLoading:", isLoading)
    if (!isLoading) {
      const fetchData = async () => {
        console.log("INVENTORY- accountType:", accountType);
        if (accountType === 'Player') {
          const inventoryResponse = await axios.get('/api/inventory', {  headers });
          setInventory(inventoryResponse.data.inventory);
        } else if (accountType === 'DM') {
          const itemsResponse = await axios.get('/api/items', { headers });
          setInventory(itemsResponse.data.items);
        }
        setIsLoading(false); // set loading to false after the data is fetched
      };

      fetchData();
    }
  }, [isLoading, headers, accountType]);

  // Define a function to fetch players
  const fetchPlayers = useCallback(async () => {
    try {
      const response = await axios.get('/api/players', { headers: headers });
      console.log("INVENTORY VIEW- players:", response.data.players)
      setPlayers(response.data.players.filter(player => player.character_name !== characterName));
    } catch (error) {
      console.error('Failed to fetch players:', error.response.data);
    }
  }, [characterName, headers]);

  // Fetch players when the component mounts
  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Update active_users and list of players
  useEffect(() => {
    socket.on('active_users', fetchPlayers);

    return () => {
      socket.off('active_users');
    };
  }, [socket, fetchPlayers]);


  // For when a player is given a new item
  useEffect(() => {
    socket.on('inventory_update', async function(data) {
      // Update the player's inventory
      console.log('Inventory update:', data);
      console.log("Does", data.character_name, "match", characterName + "?")
      // Request the server to get the latest inventory
      const response = await axios.get('/api/inventory', { headers: headers });
      const updatedInventory = response.data.inventory;

      setInventory(updatedInventory);
    });

    return () => {
      socket.off('inventory_update');
    };
  }, [headers, socket]);


  // Update Player Inventory on change
  const fetchInventory = async () => {
    console.log("**** Fetchign Inventory ****");
    if (accountType === "player") {
      try {
        const response = await axios.get('/api/inventory', { headers: headers });
        const inventory = response.data.inventory;
        if (inventory.length > 0) {
          setInventory(inventory); // Save all inventory items in state
        }
      } catch (error) {
        console.error('Error loading inventory:', error.response.data);
      }
    } else if (accountType === "DM") {
      try {
        const response = await axios.get('/api/items', { headers: headers });
        console.log("INVENTORY- response for DM:", response.data);
        console.log("Items from response:", response.data.items);
        const inventory = response.data.items;
        console.log("Items for DM:", inventory);
        if (inventory && inventory.length > 0) {
          setInventory(inventory); // Save all inventory items in state
        }
      } catch (error) {
        console.error('Error loading inventory:', error.response.data);
      }
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [headers]);

  // Runs fetchInventory when the socket message is received
  useEffect(() => {
    // Listen for 'items_updated' event
    socket.on('items_updated', fetchInventory);

    // Cleanup function to remove the event listener when component unmounts
    return () => {
      socket.off('items_updated');
    };
  }, [socket, fetchInventory, accountType]);

  const [inventoryItem, setInventoryItem] = useState(null);

  // Whenever the selected item changes, also update the inventory item
  useEffect(() => {
    setInventoryItem(selectedItem);
  }, [selectedItem]);


  //*********** Make the Table Arrangeable ****************//
  const [columnOrder, setColumnOrder] = useState(['Name', 'Type', 'Cost', 'Value', 'Description']);

  const [selectedColumns, setselectedColumns] = useState({
    'Name': true,
    'Type': true,
    'Cost': accountType === 'DM',
    'Quantity': accountType === 'Player',
    'Value': accountType === 'Player',
    'Description': true,
    'Weight': false,
  });

  // Updates the column order
  useEffect(() => {
    setColumnOrder(prevOrder => prevOrder.filter(column => selectedColumns[column]));
  }, [selectedColumns]);


  const moveColumn = (dragName, hoverName) => {
    const dragIndex = columnOrder.indexOf(dragName);
    const hoverIndex = columnOrder.indexOf(hoverName);
    const dragColumn = columnOrder[dragIndex];
    const newOrder = [...columnOrder];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, dragColumn);
    setColumnOrder(newOrder);
  };

  function DraggableHeader({ id, onMoveColumn, onClick, children }) {
    const [{ isDragging }, drag] = useDrag({
      type: 'column',
      item: { id },
      collect: monitor => ({
        isDragging: !!monitor.isDragging(),
      }),
    })

    const [, drop] = useDrop({
      accept: 'column',
      hover(item) {
        if (item.id !== id) {
          onMoveColumn(id, item.id)
        }
      },
    })

    return (
      <th
        ref={node => drag(drop(node))}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        onClick={onClick}
      >
        {children}
      </th>
    )
  }


  function SelectableRow({ item, columnOrder, selectedColumns, onClick }) {
    return (
      <tr
        style={{ opacity: 1 }}
        onClick={() => onClick()}
      >
        {columnOrder.filter(column => selectedColumns[column]).map((column) => (
          <td key={column}>{renderCell(item, column)}</td>
        ))}
      </tr>
    );
  }


  const handleColumnSelection = (column) => {
    setselectedColumns(prevColumns => ({
      ...prevColumns,
      [column]: !prevColumns[column]
    }));

    setColumnOrder(prevOrder => {
      if (prevOrder.includes(column)) {
        // If the column is currently in the order, remove it
        return prevOrder.filter(col => col !== column);
      } else {
        // If the column is not in the order, add it
        return [...prevOrder, column];
      }
    });
  };


  // renders a cell when the columns have been moved
  function renderCell(item, columnKey) {
    if (selectedColumns[columnKey]) {
      switch (columnKey) {
        case 'Name':
          return item.name;
        case 'Type':
          return item.type;
        case 'Cost':
          return accountType === 'DM' ? `${item.cost} ${item.currency}` : null;
        case 'Currency':
          return item.currency;
        case 'Quantity':
          return accountType === 'Player' ? item.quantity : null;
        case 'Value':
          return accountType === 'Player' ? `${item.cost * item.quantity} ${item.currency}` : null;
        case 'Description':
          return item.description;
        default:
          return null;
      }
    }
    return null;
  }


  /******* Adding Items from CSV ********/
  // When the user clicks "Upload CSV", either parse the file or create a blank item
  const parseCSV = () => {
    if (csvFile) {
      // CSV parsing logic
      Papa.parse(csvFile, {
        header: true,
        complete: function(results) {
          const data = results.data
          .map(item => {
            // Remove all blank lines
            let newItem = {};
            for (let key in item) {
              // Change each key to title case
              let newKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
              if (newKey === 'Currency') {
                // Convert the currency abbreviation to full name
                newItem[newKey] = convertCurrencyAbbreviation(item[key]);
              } else {
                newItem[newKey] = item[key];
              }
            }
            return newItem;
          })
          .filter(item => !isItemBlank(item));  // Filter out completely blank items

          console.log("data:", data)  // For testing purposes

          // Update state with the parsed items
          setUploadedItems(data);
          // Update fieldName with keys from the first item
          setFieldName(Object.keys(data[0]));
          // Close the upload modal and open the item review modal
          setShowUploadModal(false);
          setAddingItems(true);
        }
      });
    }
  };

  // Save items, removing the last blank item if it exists
  const handleSaveItems = () => {
    let itemsToSave = [...uploadedItems];

    // Check if the last item is blank and remove it if so
    const lastItem = itemsToSave[itemsToSave.length - 1];
    if (!Object.values(lastItem).some(value => value !== '')) {
      itemsToSave.pop();
    }

    axios.post('/api/save_items', { items: itemsToSave })
      .then(response => {
        // Handle the response
        console.log("response:", response);
        // Close the item review modal
        setAddingItems(false);
        // Clear the uploaded items
        setUploadedItems([]);
        // Fetch the new inventory
        fetchInventory();
      })
      .catch(error => {
        // Handle the error
        console.error(error);
      });
  };

  const isItemBlank = (item) => {
    // We're assuming that an item is blank if all its fields, except 'Currency', are empty.
    // Modify this logic if your definition of a blank item is different.
    let blankFields = ['Name', 'Type', 'Cost', 'Description'];
    return blankFields.every(field => item[field] === '');
  };

  // Used to add a new line to the CSV Table
  const handleInputChange = (index, fieldName, value) => {
    // Create a new copy of the uploadedItems array
    let newUploadedItems = [...uploadedItems];

    // If the item at the given index doesn't exist, create it
    if (!newUploadedItems[index]) {
      newUploadedItems[index] = {};
    }

    // Update the field of the item at the given index
    newUploadedItems[index][fieldName] = value;

    // Update the uploadedItems state
    setUploadedItems(newUploadedItems);
  };


  /******* Create a New Item ********/
  const createItem = async () => {
    try {
      let response;
      if (newItemType === 'Weapon') {
        console.log("** Creating weapon **");
        response = await axios.post('/api/items', {
          name: newItemName,
          type: newItemType,
          cost: newItemCost,
          currency: newItemCurrency,
          description: newItemDescription,
          damage: newItemDamage,
          damageType: newItemDamageType
        }, { headers: headers });
        console.log("Creating weapon:", response.data.item);
      } else if (newItemType === 'Armor') {
        console.log("** Creating armor **");
        response = await axios.post('/api/items', {
          name: newItemName,
          type: newItemType,
          cost: newItemCost,
          currency: newItemCurrency,
          description: newItemDescription,
          ac: newItemAC
        }, { headers: headers });
        console.log("Creating armor:", response.data.item);
      } else if (newItemType === 'Ring' || newItemType === 'Wand' || newItemType === 'Scroll') {
        console.log("** Creating Scroll/Ring/Wand **");
        response = await axios.post('/api/items', {
          name: newItemName,
          type: newItemType,
          cost: newItemCost,
          currency: newItemCurrency,
          description: newItemDescription,
          spell: newItemSpell,
          charges: newItemCharges
        }, { headers: headers });
        console.log("Creating spell item:", response.data.item);
      } else {
        console.log("** Creating generic item **");
        response = await axios.post('/api/items', {
          name: newItemName,
          type: newItemType,
          cost: newItemCost,
          currency: newItemCurrency,
          description: newItemDescription
        }, { headers: headers });
        console.log("Creating item:", response.data.item);
      }

      setNewItemName('');
      setNewItemType('');
      setNewItemCost('');
      setNewItemCurrency('Gold');
      setNewItemWeight('');
      setNewItemDescription('');
      setNewItemDamage('');
      setNewItemDamageType('');
      setNewItemAC('');
      setNewItemStealthDisadvantage('');
      setNewItemCapacity('');
      setNewItemSpeed('');
      setNewItemSpell('');
      setNewItemCharges('');

      // setInventory(prevInventory => [...prevInventory, response.data.item]);
      setCreatingItem(false);
      fetchInventory();
    } catch (error) {
      console.error('Error creating item:', error.response.data);
    }
  };

  function closeCreateModal() {
    setNewItemName('');
    setNewItemType('');
    setNewItemCost('');
    setNewItemCurrency('Gold');
    setNewItemDescription('');
    setNewItemWeight('');
    setNewItemDamage('');
    setNewItemDamageType('');
    setNewItemAC('');
    setNewItemStealthDisadvantage('');
    setNewItemCapacity('');
    setNewItemSpeed('');
    setNewItemSpell('');
    setNewItemCharges('');

    setCreatingItem(false);
  }

  /******* Updating Item Details ********/
  // For changing an entire item
  const handleItemChange = (index, name, value) => {
    let newItems = [...uploadedItems];
    newItems[index][name] = value;

    if (index === uploadedItems.length - 1) {
      newItems.push({
        Name: '',
        Type: '',
        Cost: '',
        Currency: '',
        Description: ''
      });
    }

    setUploadedItems(newItems);
  };

  // For changing an item's details
  const handleSelectChange = (index, name, value) => {
    let updatedItems = [...uploadedItems];
    updatedItems[index][name] = value;
    setUploadedItems(updatedItems);
  }

  function convertCurrencyAbbreviation(currency) {
    switch(currency.toLowerCase()) {
      case 'cp':
        return 'Copper';
      case 'gp':
        return 'Gold';
      case 'sp':
        return 'Silver';
      case 'ep':
        return 'Electrum';
      case 'pp':
        return 'Platinum';
      default:
        return currency; // return original string if no match found
    }
  }

  // Then use it when displaying currency to user
  const fullCurrencyName = convertCurrencyAbbreviation(newItemCurrency);
  /**************************************/

  const handleItemSelection = (item) => {
    console.log("INVENTORY- selectedItem being set:", item);
    setSelectedItem(item);
    setShowViewItemDetails(true);
  };

  const giveItemToAnotherPlayer = useCallback(() => {
    console.log(`Giving item ${selectedItem.id} in quantity ${dropQuantity} to ${selectedPlayer.character_name}.`);

    const messageObj = {
      type: 'item_transfer',
      sender: characterName,
      text: `${characterName} gave you ${dropQuantity} ${selectedItem.name}`,
      recipients: [selectedPlayer.username],
      item: { ...selectedItem, quantity: dropQuantity },
    };

    socket.emit('sendMessage', messageObj);
    setShowItemDetails(false);
  }, [ characterName, dropQuantity, selectedItem, selectedPlayer, socket]);

  // Issue an item to a player
  const issueItemToPlayer = () => {
    console.log("INVENTORY- selectedPlayer:", selectedPlayer);
    console.log("INVENTORY- selectedPlayer.username:", selectedPlayer.username);
    console.log("INVENTORY- selectedPlayer.character_name:", selectedPlayer.character_name);
    console.log("INVENTORY- selectedItem:", selectedItem);
    console.log("INVENTORY- selectedItem.id:", selectedItem.id);

    // Issue an item via messageObj
    const messageObj = {
      type: 'item_transfer',
      sender: characterName,
      text: `You received ${quantity} of ${selectedItem.name}`,
      recipients: [selectedPlayer.username],
      item: { ...selectedItem, quantity: parseInt(quantity) },
    };

    socket.emit('sendMessage', messageObj);

    setShowItemDetails(false);
    // fetchInventory(); // Refetch inventory after issuing an item
  };


  const handleCloseItemDetails = async () => {
    // console.log("INVENTORY- Closing modal for", accountType)
    if (accountType === 'DM') {
      try {
        await axios.put(`/api/items/${selectedItem.id}`, selectedItem, { headers: headers });
        setInventory(inventory.map(item => item.id === selectedItem.id ? selectedItem : item));

        setNewItemCharges('');

        setShowItemDetails(false);
      } catch (error) {
        console.error('Error updating item:', error.response.data);
      }
    } else {
      setShowItemDetails(false);
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await axios.delete(`/api/items/${itemId}`, { headers: headers });
      setInventory(inventory.filter(item => item.id !== itemId));
      setShowItemDetails(false);
    } catch (error) {
      console.error('Error deleting item:', error.response.data);
    }
  };

  const dropItem = async (item, quantity) => {
    console.log("INVENTORY- Dropping item:", item)
    console.log("INVENTORY- Dropping item ID:", item.id)
    if (item && item.id) { // Check if item and its id exist.
      try {
        await axios.delete(`/api/inventory/${item.id}`, {
          headers,
          data: {
            quantity: quantity // Use the 'quantity' parameter
          }
        });
        setInventory(inventory.filter(i => i.id !== item.id));
        setShowItemDetails(false);
      } catch (error) {
        console.error('Error dropping item:', error.response.data);
      }
    } else {
      console.error('item or item.id is not defined.');
    }
  };


  if (isLoading) {
    return (
      <div className="spinner">
        <div className="circle"></div>
      </div>
    );
  }

  return (
    <Container>
      <Row>
        <h1>Welcome back, {characterName}!</h1>
      </Row>
      <Row>
        <Col sm={10}>
          <Form.Control
            type="search"
            placeholder="Search"
            onChange={event => setSearchTerm(event.target.value)}
          />
        </Col>
        <Col sm={2}>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <SortIcon />
          </Button>
        </Col>
      </Row>
      <DndProvider backend={HTML5Backend}>
        <Table striped bordered hover>
          <thead>
            <tr>
              {columnOrder.map((column, index) => (
                <DraggableHeader
                  key={column}
                  id={column}
                  onMoveColumn={moveColumn}
                  onClick={() => {
                    console.log("Column clicked");
                    onSort(column);
                  }}
                >
                  {column}
                </DraggableHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.length}>You don't have anything in your inventory yet!</td>
              </tr>
            ) : (
              [...sortedInventory]
              .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((item, index) => (
                <SelectableRow
                  key={index}
                  item={item}
                  columnOrder={columnOrder}
                  selectedColumns={selectedColumns}
                  onClick={() => {
                    console.log("Row clicked");
                    handleItemSelection(item);
                  }}
                />
              ))
            )}
          </tbody>
        </Table>
      </DndProvider>
      {accountType === 'DM' && (
        <>
          <Button onClick={() => setCreatingItem(true)}>Create Item</Button>
          <Button onClick={() => setShowUploadModal(true)}>Add Items</Button>
        </>
      )}

      {/* Choose Visible Columns Modal*/}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Select Columns</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.entries(selectedColumns).map(([column, isSelected]) => (
            <Form.Check
              type="checkbox"
              label={column}
              checked={isSelected}
              onChange={() => handleColumnSelection(column)}
            />
          ))}
        </Modal.Body>
      </Modal>


      {/* Create New Item Modal */}
      <Modal show={creatingItem} onHide={closeCreateModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Name & Type */}
          <Row>
            <Col>
              <input
              type="text"
              placeholder="Item Name"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
            />
            </Col>
            <Col>
              <select
                value={newItemType}
                onChange={e => setNewItemType(e.target.value)}
              >
                <option value="" disabled selected>Select item type</option>
                <option value="Armor">Armor</option>
                <option value="Weapon">Weapon</option>
                <option value="Potion">Potion</option>
                <option value="Scroll">Scroll</option>
                <option value="Wand">Wand</option>
                <option value="Ring">Ring</option>
                <option value="Rod">Rod</option>
                <option value="Staff">Staff</option>
                <option value="Wondrous Item">Wondrous Item</option>
                <option value="Adventuring Gear">Adventuring Gear</option>
                <option value="Tools">Tools</option>
                <option value="Mounts and Vehicles">Mounts and Vehicles</option>
                <option value="Trade Goods">Trade Goods</option>
                <option value="Treasure">Treasure</option>
              </select>
            </Col>
          </Row>
          {/* Weight */}
          <Row>
            <input
              type="number"
              placeholder="Item Weight"
              value={newItemWeight}
              onChange={e => setNewItemWeight(e.target.value)}
            />
          </Row>
          {/* Specific Details */}
          <Row>
            {newItemType === 'Mounts and Vehicles' && (
              <>
                <Col>
                  <input
                    type="number"
                    placeholder="Speed"
                    value={newItemSpeed}
                    onChange={e => setNewItemSpeed(e.target.value)}
                  />
                </Col>
                <Col>
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={newItemCapacity}
                    onChange={e => setNewItemCapacity(e.target.value)}
                  />
                </Col>
              </>
            )}
            {newItemType === 'Weapon' && (
              <>
                <Col>
                  <input
                    type="text"
                    placeholder="Damage"
                    value={newItemDamage}
                    onChange={e => setNewItemDamage(e.target.value)}
                  />
                </Col>
                <Col>
                  <select
                    value={newItemDamageType}
                    onChange={e => setNewItemDamageType(e.target.value)}
                  >
                    <option value="" disabled selected>Select damage type</option>
                    <option value="Acid">Acid</option>
                    <option value="Bludgeoning">Bludgeoning</option>
                    <option value="Cold">Cold</option>
                    <option value="Fire">Fire</option>
                    <option value="Force">Force</option>
                    <option value="Lightning">Lightning</option>
                    <option value="Necrotic">Necrotic</option>
                    <option value="Piercing">Piercing</option>
                    <option value="Poison">Poison</option>
                    <option value="Psychic">Psychic</option>
                    <option value="Radiant">Radiant</option>
                    <option value="Slashing">Slashing</option>
                    <option value="Thunder">Thunder</option>
                  </select>
                </Col>
              </>
            )}
            {newItemType === 'Armor' && (
              <>
              <Col>
                <input
                  type="number"
                  placeholder="AC"
                  value={newItemAC}
                  onChange={e => setNewItemAC(e.target.value)}
                />
              </Col>
              <Col>
                <label>
                  <input
                    type="checkbox"
                    checked={newItemStealthDisadvantage}
                    onChange={e => setNewItemStealthDisadvantage(e.target.checked)}
                  />
                  Stealth Disadvantage
                </label>
              </Col>
              </>
            )}
          </Row>
          {/* Cost */}
          <Row>
            <Col>
              <input
                type="number"
                placeholder="Item Cost"
                value={newItemCost}
                onChange={e => setNewItemCost(e.target.value)}
              />
            </Col>
            <Col>
              <select
                value={newItemCurrency}
                onChange={e => setNewItemCurrency(e.target.value)}
              >
                <option value="" disabled selected>Select currency type</option>
                <option value="Copper">Copper</option>
                <option value="Silver">Silver</option>
                <option value="Electrum">Electrum</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </Col>
          </Row>
          {/* Description */}
          <Row>
            <textarea
              placeholder="Item Description"
              value={newItemDescription}
              onChange={e => setNewItemDescription(e.target.value)}
            />
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={createItem}>
            Add Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* File Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload CSV</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="file"
            accept=".csv"
            onChange={e => {
              const file = e.target.files[0];
              const fileType = file.name.split('.').pop().toLowerCase();
              if (fileType !== 'csv') {
                alert('Invalid file type. Please upload a CSV file.');
              } else {
                setCsvFile(file);
              }
            }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={parseCSV}>
            Upload
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Multiple New Items via CSV */
      /* This Modal shows a table with the uploaded items in it for revision*/}
      <Modal show={addingItems} onHide={() => setAddingItems(false)} fullscreen={true}>
        <Modal.Header closeButton>
          <Modal.Title>Uploaded Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                {fieldName.map((name, i) => (
                  <th key={i}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploadedItems.map((item, index) => (
                <tr key={index}>
                  {fieldName.map((name, j) => (
                    <td key={j}>
                      {name === "Type" ? (
                        <select
                          value={item[name]}
                          onChange={e => handleSelectChange(index, name, e.target.value)}
                        >
                          <option value="" disabled selected>Select item type</option>
                          <option value="Armor">Armor</option>
                          <option value="Weapon">Weapon</option>
                          <option value="Potion">Potion</option>
                          <option value="Scroll">Scroll</option>
                          <option value="Wand">Wand</option>
                          <option value="Ring">Ring</option>
                          <option value="Rod">Rod</option>
                          <option value="Staff">Staff</option>
                          <option value="Wondrous Item">Wondrous Item</option>
                          <option value="Adventuring Gear">Adventuring Gear</option>
                          <option value="Tools">Tools</option>
                          <option value="Mounts and Vehicles">Mounts and Vehicles</option>
                          <option value="Trade Goods">Trade Goods</option>
                          <option value="Treasure">Treasure</option>
                        </select>
                      ) : name === "Currency" ? (
                        <select
                          value={item[name]}
                          onChange={e => handleSelectChange(index, name, e.target.value)}
                        >
                          <option value="" disabled selected>Select Currency type</option>
                          <option value="Copper">Copper</option>
                          <option value="Silver">Silver</option>
                          <option value="Electrum">Electrum</option>
                          <option value="Gold">Gold</option>
                          <option value="Platinum">Platinum</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={item[name]}
                          onChange={e => handleItemChange(index, name, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleSaveItems}>Save Items</Button>
        </Modal.Footer>
      </Modal>

      {/* View ItemDetails Modal */}
      <Modal show={showViewItemDetails} onHide={() => setShowViewItemDetails(false)} centered>
        <ModalDialog>
          <Modal.Header closeButton>
            <Modal.Title className="w-100 text-center">
              <Col sm={10}>
                <Form.Control
                  type="text"
                  value={selectedItem?.name}
                  onChange={e => setSelectedItem({ ...selectedItem, name: e.target.value })}
                />
              </Col>
              <Col sm={2}>
                {accountType === 'DM' && (
                  <Button variant="primary" onClick={() => setShowEditItemDetails(true)}>
                    <EditIcon />
                  </Button>
                )}
              </Col>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container>
              <Row>
                <Col>{selectedItem?.type}</Col>
                <Col className="text-right">{selectedItem?.cost} {selectedItem?.currency}</Col>
              </Row>
              <Row>
                <Col>Weight: {selectedItem?.weight}</Col>
              </Row>
              <Row>
              {selectedItem?.type === 'Mounts and Vehicles' && (
                <>
                  <Col>Speed: {selectedItem?.speed}</Col>
                  <Col>Capacity: {selectedItem?.capacity}</Col>
                </>
              )}
              {selectedItem?.type === 'Weapon' && (
                <>
                  <Col>Damage: {selectedItem?.damage} {selectedItem?.damage_type}</Col>
                  <Col>Range: {selectedItem?.weapon_range}</Col>
                </>
              )}
              {selectedItem?.type === 'Armor' && (
                <>
                  <Row>AC: {selectedItem?.armor_class}</Row>
                  <Row>Strength Needed: {selectedItem?.strength_needed}</Row>
                  <Row>Stealth Disadvantage: {selectedItem?.stealthDisadvantage ? "Yes" : "No"}</Row>
                </>
              )}
              </Row>
              <Row>
                <Col>Description: {selectedItem?.description}</Col>
              </Row>
            </Container>
          </Modal.Body>
          <Modal.Footer>
            {accountType === 'DM' && (
              <>
                <select onChange={e => setSelectedPlayer(players.find(player => player.username === e.target.value))}>
                  <option value="" disabled selected>Select a player</option>
                  {players.map((player, index) => (
                    <option key={index} value={player.username}>{player.character_name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
                <Button variant="primary" onClick={issueItemToPlayer}>
                  Issue to Player
                </Button>
              </>
            )}
          </Modal.Footer>
        </ModalDialog>
      </Modal>

      {/* Edit ItemDetails Modal */}
      <Modal show={showEditItemDetails} onHide={() => setShowEditItemDetails(false)} centered>
      <ModalDialog>
        <Modal.Header closeButton>
          <Modal.Title className="w-100 text-center">
            <Form.Control
              type="text"
              value={selectedItem?.name}
              onChange={e => setSelectedItem({ ...selectedItem, name: e.target.value })}
            />
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Row>
              <Col>
                <Form.Control
                  as="select"
                  value={selectedItem?.type}
                  onChange={e => setSelectedItem({ ...selectedItem, type: e.target.value })}
                  >
                  <option value="" disabled selected>Select item type</option>
                  <option value="Armor">Armor</option>
                  <option value="Weapon">Weapon</option>
                  <option value="Potion">Potion</option>
                  <option value="Scroll">Scroll</option>
                  <option value="Wand">Wand</option>
                  <option value="Ring">Ring</option>
                  <option value="Rod">Rod</option>
                  <option value="Staff">Staff</option>
                  <option value="Wondrous Item">Wondrous Item</option>
                  <option value="Adventuring Gear">Adventuring Gear</option>
                  <option value="Tools">Tools</option>
                  <option value="Mounts and Vehicles">Mounts and Vehicles</option>
                  <option value="Trade Goods">Trade Goods</option>
                  <option value="Treasure">Treasure</option>
                </Form.Control>
              </Col>
              <Col className="text-right">
                <>
                  <Form.Control
                    type="number"
                    value={selectedItem?.cost}
                    onChange={e => setSelectedItem({ ...selectedItem, cost: e.target.value })}
                  />
                  <Form.Control
                    as="select"
                    value={selectedItem?.currency}
                    onChange={e => setSelectedItem({ ...selectedItem, currency: e.target.value })}
                  >
                    <option value="Copper">Copper</option>
                    <option value="Silver">Silver</option>
                    <option value="Electrum">Electrum</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </Form.Control>
                </>
              </Col>
            </Row>
            <Row>
              <Col>
                <input
                  type="number"
                  placeholder="Item Weight"
                  value={selectedItemWeight}
                  onChange={e => setSelectedItemWeight(e.target.value)}
                />
              </Col>
              <Col>
                {selectedItem?.type === 'Mounts and Vehicles' && (
                  <>
                    <input
                      type="number"
                      placeholder="Speed"
                      value={selectedItemSpeed}
                      onChange={e => setSelectedItemSpeed(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Capacity"
                      value={selectedItemCapacity}
                      onChange={e => setSelectedItemCapacity(e.target.value)}
                    />
                  </>
                )}
                {selectedItem?.type === 'Weapon' && (
                  <>
                    <Form.Control
                      type="number"
                      value={selectedItem?.damage}
                      onChange={e => setSelectedItem({ ...selectedItem, damage: e.target.value })}
                    />
                    <Form.Control
                      type="number"
                      value={selectedItem?.range}
                      onChange={e => setSelectedItem({ ...selectedItem, range: e.target.value })}
                    />
                    <Form.Control
                      type="text"
                      value={selectedItem?.damage_type}
                      onChange={e => setSelectedItem({ ...selectedItem, damage_type: e.target.value })}
                    />
                  </>
                )}
                {selectedItem?.type === 'Armor' && (
                  <>
                    <Form.Control
                      type="number"
                      value={selectedItem?.AC}
                      onChange={e => setSelectedItem({ ...selectedItem, AC: e.target.value })}
                    />
                    <Form.Control
                      as="select"
                      value={selectedItem?.type}
                      onChange={e => setSelectedItem({ ...selectedItem, type: e.target.value })}
                    >
                      <option value="Light Armor">Copper</option>
                      <option value="Medium Armor">Silver</option>
                      <option value="Heavy Armor">Electrum</option>
                    </Form.Control>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedItemStealthDisadvantage}
                        onChange={e => setSelectedItemStealthDisadvantage(e.target.checked)}
                      />
                      Disadvantage to Stealth
                    </label>
                  </>
                )}
              </Col>
              <Form.Control
                as="textarea"
                value={selectedItem?.description}
                onChange={e => setSelectedItem({ ...selectedItem, description: e.target.value })}
              />
            </Row>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => deleteItem(selectedItem.id)}>
            Delete Item
          </Button>
        </Modal.Footer>
      </ModalDialog>
      </Modal>
    </Container>
  );
}
