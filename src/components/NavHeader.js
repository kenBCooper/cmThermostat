import React, { Component } from 'react';
import {
  Nav,
  Navbar,
  NavItem,
} from 'react-bootstrap';
import { withRouter } from 'react-router-dom'

class NavHeader extends Component {
  render() {
    return (
      <Navbar onSelect={(eventKey, event) => this.handleNavigation(eventKey, event)}>
        <Navbar.Header>
          <Navbar.Brand>Thermostat-Control</Navbar.Brand>
        </Navbar.Header>
      <Nav>
        <NavItem href="/" eventKey={1}>Zones</NavItem>
        <NavItem href="d" eventKey={2}>Diagnostics</NavItem>
      </Nav>
      </Navbar>
    );
  }

  handleNavigation = (eventKey, event) => {
    event.preventDefault();
    this.props.history.push(event.target.pathname)
  }
}

export default withRouter(NavHeader);