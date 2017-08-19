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

class NavHeader extends Component {
  render() {
    const urlParts = this.props.location.pathname.split('/');
    const currentRm = urlParts[1] || 1;

    return (
      <Navbar onSelect={(eventKey, event) => this.handleNavigation(eventKey, event)}>
      <Nav>
        {this.renderGenxDropdown()}
        <NavItem href={`/${currentRm}`} eventKey={1}>Zones</NavItem>
        <NavItem href={`/${currentRm}/d`} eventKey={2}>Diagnostics</NavItem>
      </Nav>
      </Navbar>
    );
  }

  renderGenxDropdown() {
    if (this.props.rmCount === 0) {
      return <NavItem href="/1" eventKey={1}>GenX</NavItem>
    } else {
      return (
        <NavDropdown eventKey="1" title="GenX" id="genx-dropdown">
          <MenuItem eventKey="1.1">System 1</MenuItem>
          {this.renderGenxDropdownMenuItems()}
        </NavDropdown>
      );
    }
  }

  renderGenxDropdownMenuItems() {
    let menuItems = [];
    for (let i=0; i < this.props.rmCount; i++) {
      const key = `1.${i + 2}`;
      menuItems.push(<MenuItem key={key} eventKey={key}>{`System ${i+2}`}</MenuItem>)
    }
    return menuItems;
  }

  handleNavigation = (eventKey, event) => {
    event.preventDefault();
    this.props.history.push(event.target.pathname)
  }
}

const mapStateToProps = (state) => {
  return {
    rmCount: state.shadow.discover ? parseInt(state.shadow.discover.rmCount, 10) : 0,
  }
}

export default withRouter(connect(mapStateToProps, undefined)(NavHeader));

        // <NavDropdown eventKey="4" title="Dropdown" id="nav-dropdown">
        //   <MenuItem eventKey="4.1">Action</MenuItem>
        //   <MenuItem eventKey="4.2">Another action</MenuItem>
        //   <MenuItem eventKey="4.3">Something else here</MenuItem>
        //   <MenuItem divider />
        //   <MenuItem eventKey="4.4">Separated link</MenuItem>
        // </NavDropdown>