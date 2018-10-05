import React, { Component } from 'react';
import { Collapse, Glyphicon } from 'react-bootstrap';
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux';

import logo from '../img/Zonex_Logo.png';
import { retryShadowConnection } from '../util/deviceShadowUtil';
import {
  selectRmCountsForGenXs,
  selectMacList,
  selectCurrentSystemNumber,
  selectCurrentGenX,
  selectAllSystemNames,
} from '../selectors/AppSelectors';
import {
  resetShadow,
  setCurrentSystem,
  setCurrentGenX,
} from '../actions/AppActions';
import './NavSidebar.css';

class NavSideBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      expandedGenXs: [],
    };
  }

  onSelectSystem = (event) => {
    const systemToSelect = parseInt(event.target.id);
    this.props.onSelectSystem(systemToSelect);
  }

  onRefresh = () => {
    retryShadowConnection();
    this.props.onRefresh();
  }

  selectRm = (selectedGenXMac, rmNumber) => {
    this.props.onSelectGenX(selectedGenXMac);
    this.props.onSelectSystem(rmNumber);
  }

  selectGenX = (selectedGenXMac) => {
    this.props.onSelectGenX(selectedGenXMac);
    this.props.onSelectSystem(0);
  }

  toggleGenXExpansion = (genX) => {
    if (this.isGenXExpanded(genX)) {
      this.setState({
        expandedGenXs: this.state.expandedGenXs.filter((expandedGenX) => expandedGenX !== genX),
      });
    } else {
      this.setState({
        expandedGenXs: this.state.expandedGenXs.concat([genX]),
      });
    }
  }

  isGenXExpanded = (genX) => {
    return this.state.expandedGenXs.includes(genX);
  }

  render() {
    return (
      <div className="nav-sidebar">
        <img className="nav-sidebar-logo" src={logo}
          alt="Zonex Systems Logo"/>
        <div className="nav-list">
          <div className="systems-section">
            {this.renderGenXMenuItems()}
          </div>
          <div className="controls-section">
            <div
              className="nav-list-control-item clickable-nav-item"
              onClick={this.onRefresh}
            >
              <Glyphicon className="nav-icon-left" glyph="refresh"/>
              Refresh
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderGenXMenuItems() {
    let genXMenuItems = [];

    this.props.genXs.forEach((genXmac, i) => {
      const rmCount = this.props.rmCounts[genXmac];
      const isExpanded = rmCount && this.isGenXExpanded(genXmac);

      const isSelected = (
        !isExpanded &&
        this.props.selectedGenX === genXmac &&
        this.props.selectedSystemNumber === 0
      );

      const menuItemClass = `nav-list-item clickable-nav-item${isSelected ? ' selected' : ''}`
      const menuItem = (
        <section key={genXmac}>
          <div
            id={genXmac}
            onClick={() => {
              this.selectGenX(genXmac);
              this.toggleGenXExpansion(genXmac);
            }}
            className={menuItemClass}
          >
            <div className="nav-text-truncate">
              {this.props.systemNames[genXmac][0]}
            </div>
            {rmCount ? this.renderCollapseToggle(isExpanded) : null}
          </div>          
          <Collapse
            in={this.isGenXExpanded(genXmac)}
          >
            <div>
              {this.renderSystemsForGenX(genXmac)}
            </div>
          </Collapse>
        </section>
      );

      genXMenuItems.push(menuItem);
    });

    return genXMenuItems;
  };

  renderCollapseToggle(isOpen) {
    return (
      <Glyphicon
        className="nav-icon-right"
        glyph={isOpen ? "chevron-up" : "chevron-down"}
      />
    );
  }

  renderSystemsForGenX(genX) {
    const rmCount = this.props.rmCounts[genX];
    if (rmCount < 1) return null;

    const rmMenuItems = [];
    for (let sysNumber=0; sysNumber <= rmCount; sysNumber++) {
      const isSelected = (
        this.props.selectedGenX === genX &&
        this.props.selectedSystemNumber === sysNumber
      );
      const menuItemClass = `system-list-item clickable-nav-item${isSelected ? ' selected': ''}`;
      rmMenuItems.push(
        <div
          className={menuItemClass}
          id={sysNumber}
          key={sysNumber}
          onClick={() => this.selectRm(genX, sysNumber)}
        >
          <div className="nav-text-truncate">
            {sysNumber === 0 ? this.props.systemNames[genX][0] : this.props.systemNames[genX][sysNumber]}
          </div>
        </div>
      );
    };
    return rmMenuItems;
  }
}

const mapStateToProps = (state) => {
  return {
    rmCounts: selectRmCountsForGenXs(state),
    genXs: selectMacList(state),
    selectedGenX: selectCurrentGenX(state),
    selectedSystemNumber: selectCurrentSystemNumber(state),
    systemNames: selectAllSystemNames(state),
  };
}

const mapDispatchToProps = (dispatch) => {
  return {
    onRefresh: () => dispatch(resetShadow()),
    onSelectSystem: (systemNo) => dispatch(setCurrentSystem(systemNo)),
    onSelectGenX: (genXMacAddress) => dispatch(setCurrentGenX(genXMacAddress)),
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(NavSideBar));

