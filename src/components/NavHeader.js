import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  Nav,
  Navbar,
  NavItem,
  NavDropdown,
  MenuItem,
} from 'react-bootstrap';
import { withRouter } from 'react-router-dom'

import { getCurrentSystem } from '../util/urlUtil'; 

class NavHeader extends Component {
  render() {
    const currentSystem = getCurrentSystem();

    return (
      <Navbar onSelect={(eventKey, event) => this.handleNavigation(eventKey, event)}>
      <Nav>
        {this.renderGenxDropdown()}
        <NavItem href={`/${currentSystem}`} eventKey={1}>Zones</NavItem>
        <NavItem href={`/${currentSystem}/d`} eventKey={2}>Diagnostics</NavItem>
      </Nav>
      </Navbar>
    );
  }

  renderGenxDropdown() {
    if (this.getRmCount() === 0) {
      return <NavItem href="/0" eventKey={1}>GenX</NavItem>
    } else {
      return (
        <NavDropdown title="GenX" id="genx-dropdown">
          <MenuItem href = "/0" eventKey="0">GenX</MenuItem>
          {this.renderGenxDropdownMenuItems()}
        </NavDropdown>
      );
    }
  }

  renderGenxDropdownMenuItems() {
    let menuItems = [];
    for (let i=0; i < this.getRmCount(); i++) {
      menuItems.push(
        <MenuItem href={`/${i+1}`} key={i + 1} eventKey={i + 1}>
          {`RM${i+1}`}
        </MenuItem>
      );
    }
    return menuItems;
  }

  handleNavigation = (eventKey, event) => {
    event.preventDefault();
    this.props.history.push(event.target.pathname)
  }

  getRmCount = () => {
    // Discover data is universal, so we can always rely on the discover data in genx (system 0)
    // to be true for all systems (RMs).
    const currentDiscoverData = this.props.deviceShadow[0] && 
      this.props.deviceShadow[0].discover;
    return currentDiscoverData ? parseInt(currentDiscoverData.rmCount, 10) : 0;
  }
}

const mapStateToProps = (state) => {
  return {
    deviceShadow: state.shadow,
  }
}

export default withRouter(connect(mapStateToProps, undefined)(NavHeader));
