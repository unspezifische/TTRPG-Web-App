import React, { useState, useEffect } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, DefaultDraftBlockRenderMap, getDefaultKeyBinding } from 'draft-js';
import createListPlugin from 'draft-js-list-plugin';
import {
  blockRenderMap, CheckableListItem, CHECKABLE_LIST_ITEM, CheckableListItemUtils
} from 'draft-js-checkable-list-item';

import { Container, Button, ButtonGroup, Row, Form, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Journal.css';

import axios from 'axios';


// Create the plugins
const listPlugin = createListPlugin();

// Include the plugins in a list
const plugins = [
  listPlugin
];

function Journal({ headers, characterName }) {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [title, setTitle] = useState('');
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchEntries = async () => {
    try {
      const response = await axios.get('/api/journal', { headers: headers });
      const entries = response.data.entries;
      console.log("fetchEntries entries:", entries);
      console.log("fetchEntries entries.length:", entries.length);
      setEntries(entries); // Save all entries in state
    } catch (error) {
      console.error('Error loading journal entries:', error.response.data);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [headers]);

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const keyBindingFn = (event) => {
    if (event.keyCode === 9 /* Tab key */) {
      const newEditorState = RichUtils.onTab(event, editorState, 4); // 4 is the maxDepth
      if (newEditorState !== editorState) {
        setEditorState(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(event);
  }

  const toggleInlineStyle = (inlineStyle) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, inlineStyle));
  };

  const toggleBlockType = (blockType) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  const handleEntrySelection = (entry) => {
    console.log("JOURNAL- entry being loaded:", entry);
    const contentState = convertFromRaw(JSON.parse(entry.content));
    setTitle(entry.title); // Load the title
    setEditorState(EditorState.createWithContent(contentState));
    setSelectedEntry(entry);  // Keep track of the selected entry
  };

  const saveEntry = async () => {
    const existingEntry = entries.find((entry) => entry.title === title);
    if (existingEntry) {
      alert('An entry with this title already exists.');
      return;
    }

    const contentState = editorState.getCurrentContent();
    const rawContentState = convertToRaw(contentState);
    const entryContent = JSON.stringify(rawContentState);

    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    };

    try {
      const response = await axios.post('/api/journal', { entry: entryContent, title: title }, { headers });
      console.log(response.data);
      fetchEntries(); // Refetch entries after saving
    } catch (error) {
      console.error('Error saving journal entry:', error.response.data);
    }
  };

  const deleteEntry = async (event, entryId) => {
    // console.log("DELETING ENTRY- event:", event)
    console.log("DELETING ENTRY- entryId:", entryId)
    // Prevent the event from bubbling up to the parent elements
    event.stopPropagation();

    try {
      const response = await axios.delete(`/api/journal/${entryId.id}`, { headers });
      console.log(response.data);
      fetchEntries(); // Refetch entries after deleting
    } catch (error) {
      console.error('Error deleting journal entry:', error.response.data);
    }
  };

  const clearEntry = () => {
    setTitle('');
    setEditorState(EditorState.createEmpty());
  };


  const blockRendererFn = (block) => {
    if (block.getType() === CHECKABLE_LIST_ITEM) {
      return {
        component: CheckableListItem,
        props: {
          onChangeChecked: () => setEditorState(
            CheckableListItemUtils.toggleChecked(editorState, block)
          ),
          checked: !!block.getData().get('checked'),
        },
      }
    }
  }


  return (
    <Container>
      <h1>{characterName}'s Journal</h1>
      <Row>
        <Form.Group>
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="Entry Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Form.Group>
      </Row>
      <Row>
        <ButtonGroup>
          <Button onClick={() => toggleInlineStyle('BOLD')}>Bold</Button>
          <Button onClick={() => toggleInlineStyle('ITALIC')}>Italic</Button>
          <Button onClick={() => toggleInlineStyle('UNDERLINE')}>Underline</Button>
          <Button onClick={() => toggleBlockType('unordered-list-item')}>Bulleted List</Button>
          <Button onClick={() => toggleBlockType(CHECKABLE_LIST_ITEM)}>Checkable List</Button>
          {/* Add more buttons for other formatting options */}
        </ButtonGroup>
      </Row>
      <Row>
        <div style={{ border: '1px solid black', padding: '10px', minHeight: '200px' }}>
          <div className="editorContainer">
            <Editor
              editorState={editorState}
              handleKeyCommand={handleKeyCommand}
              keyBindingFn={keyBindingFn}
              onChange={setEditorState}
              blockRendererFn={blockRendererFn}
              blockRenderMap={DefaultDraftBlockRenderMap.merge(blockRenderMap)}
            />
          </div>
        </div>
      </Row>
      <Row>
        <Button onClick={saveEntry}>Save Entry</Button>
        <Button variant="danger" onClick={clearEntry}>Clear Entry</Button>
      </Row>
      <Row>
        <div className="entriesTable">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Title</th>
                <th>Date Created</th>
                <th>Date Modified</th>
              </tr>
            </thead>
            <tbody>
             {entries.length === 0 ? (
               <tr>
                 <td colSpan="3">You haven't created any journal entries yet!</td>
               </tr>
             ) : (
               entries.map((entry, index) => (
                 <tr key={index} onClick={() => handleEntrySelection(entry)}>
                   <td>{entry.title}</td>
                   <td>{new Date(entry.date_created).toLocaleDateString()}</td>
                   <td>{new Date(entry.date_modified).toLocaleDateString()}</td>
                   <td><Button variant="danger" onClick={(event) => deleteEntry(event, entry.id)}>Delete</Button></td>
                 </tr>
               ))
             )}
           </tbody>
          </Table>
        </div>
      </Row>
    </Container>
  );
}

export default Journal;
