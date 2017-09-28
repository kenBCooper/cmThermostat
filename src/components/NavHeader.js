import React, { Component } from 'react';
import {
  Nav,
  Navbar,
  NavItem,
} from 'react-bootstrap';
import { withRouter } from 'react-router-dom'

import { getCurrentSystemNumber } from '../util/urlUtil'; 

class NavHeader extends Component {
  render() {
    const currentSystemNumber = getCurrentSystemNumber();

    return (
      <Navbar onSelect={(eventKey, event) => this.handleNavigation(eventKey, event)}>
      <Nav>
        <NavItem href={`/${currentSystemNumber}`} eventKey={1}>Zones</NavItem>
        <NavItem href={`/${currentSystemNumber}/d`} eventKey={2}>Diagnostics</NavItem>
        <NavItem href={`/${currentSystemNumber}/s`} eventKey={2}>Schedule</NavItem>
      </Nav>
      </Navbar>
    );
  }

  handleNavigation = (eventKey, event) => {
    event.preventDefault();
    this.props.history.push(event.target.pathname)
  }
}

const mapStateToProps = (state) => {
  return {
    deviceShadow: state.shadow,
  }
}

export default withRouter(NavHeader);
