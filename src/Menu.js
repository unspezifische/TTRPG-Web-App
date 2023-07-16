import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import SideNav, { NavItem, NavIcon, NavText } from '@trendmicro/react-sidenav';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';

import '@trendmicro/react-sidenav/dist/react-sidenav.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import BackpackIcon from '@mui/icons-material/Backpack';          // Inventory
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';    // Journal
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';  // Library
import HikingIcon from '@mui/icons-material/Hiking';              // Wiki

function Menu() {
  const [isOpen, setIsOpen] = useState(false); // Start closed on desktop
  const [navExpanded, setNavExpanded] = useState(false); // Start closed on Mobile
  const navigate = useNavigate(); // used to navigate between pages
  const location = useLocation(); // used to get the current location

  const toggleOpen = () => setIsOpen(!isOpen);

  function navigateToExternalLink(url) {
    window.location.href = url;
  }

  const navigateTo = (eventKey, event) => {
    event.preventDefault();
    navigate(eventKey);
    setNavExpanded(false); // add this line
  };

  return (
    <>
      {/* SideNav is used on Desktop only */}
      <SideNav
        onSelect={(selected) => {navigate(selected); // Navigate to the selected page
        }}
        onToggle={toggleOpen}
        expanded={isOpen}
        className="d-none d-md-block"
      >
        <SideNav.Toggle />
        <SideNav.Nav>
          <NavItem eventKey="inventoryView" className={location.pathname === "/inventoryView" ? "active" : ""}>
            <NavIcon>
              <BackpackIcon />
            </NavIcon>
            <NavText>
              Inventory
            </NavText>
          </NavItem>
          <NavItem eventKey="journal" className={location.pathname === "/journal" ? "active" : ""}>
            <NavIcon>
              <HistoryEduIcon />
            </NavIcon>
            <NavText>
              Journal
            </NavText>
          </NavItem>
          {/* Add more items as needed */}
          <NavItem eventKey="library" className={location.pathname === "/library" ? "active" : ""}>
            <NavIcon>
              <LocalLibraryIcon />
            </NavIcon>
            <NavText>
              Library
            </NavText>
          </NavItem>
          <NavItem onClick={() => navigateToExternalLink('http://wiki.raspberrypi.local')}>
            <NavIcon>
              <HikingIcon />
            </NavIcon>
            <NavText>
              Wiki
            </NavText>
          </NavItem>
        </SideNav.Nav>
      </SideNav>

      {/* Mobile Menu */}
      <Navbar
        collapseOnSelect
        expand="lg"
        bg="dark"
        variant="dark"
        className="d-md-none"
        expanded={navExpanded}
        onToggle={(expanded) => setNavExpanded(expanded)}
      >
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="mr-auto">
            <Nav.Link onClick={(event) => navigateTo("inventoryView", event)} active={location.pathname === "/inventoryView"}>
              <BackpackIcon /> Inventory
            </Nav.Link>
            <Nav.Link onClick={(event) => navigateTo("journal", event)} active={location.pathname === "/journal"}>
              <HistoryEduIcon /> Journal
            </Nav.Link>
            <Nav.Link onClick={(event) => navigateTo("library", event)} active={location.pathname === "/library"}>
              <LocalLibraryIcon /> Library
            </Nav.Link>
            <Nav.Link href="http://wiki.raspberrypi.local" target="_blank" rel="noopener noreferrer">
              <HikingIcon /> Wiki
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </>
  );
}

export default Menu;
