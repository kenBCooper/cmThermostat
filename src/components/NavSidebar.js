import React, { Component } from 'react';
import { Collapse, Glyphicon } from 'react-bootstrap';
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux';
// import SideMenu, { Item } from 'react-sidemenu';
import 'react-sidemenu/dist/side-menu.css';

import logo from '../img/Zonex_Logo.png';
import { retryShadowConnection } from '../util/deviceShadowUtil';
import { selectRmCountForGenX } from '../selectors/AppSelectors';
import { resetShadow, setCurrentSystem } from '../actions/AppActions';
import './NavSidebar.css';

// We restrict the max height of the system list based on the max height of the app
// panel - the extra non system list space we want to reserve.
const SYSTEM_LIST_BUFFER_SPACE = 200;

class NavSideBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      systems: [
        { rmCount: 0},
      ],
      expandedGenXs: {
        0: false,
      },
      showSystemList: false,
    };
  }

  onSelectSystem = (event) => {
    const systemToSelect = parseInt(event.target.id);
    this.props.onSelectSystem(systemToSelect);
  }

  onRefresh = () => {
    retryShadowConnection();
    this.props.onRefresh();
    this.props.history.push('/z')
  }

  onToggleSystemMenu = () => {
    this.setState({
      showSystemList: !this.state.showSystemList,
    });
  }

  // While the collapse animation runs, we don't want flashes of the scrollbar to happen.
  // We disable the scrollbar when the animation starts and re-enable it once it is over. 
  disableScrollbarForCollapse = () => {
    this.refs.systemList.style.overflowY = 'hidden';
  }

  enableScrollBarAfterCollapse = () => {
    this.refs.systemList.style.overflowY = 'auto'; 
  }

  render() {
    return (
      <div className="nav-sidebar">
        <img className="nav-sidebar-logo" src={logo}
          alt="Zonex Systems Logo"/>
        <ul className="nav-list">
          <li onClick={this.onToggleSystemMenu} className="nav-list-item nav-text">
            <Glyphicon className="nav-icon-left" glyph="list"/>
            System
            <Glyphicon className="nav-icon-right"
                       glyph={this.state.showSystemList ? "chevron-up" : "chevron-down"}/>
          </li>
          <Collapse in={this.state.showSystemList}
                    onExit={this.disableScrollbarForCollapse}
                    onEnter={this.disableScrollbarForCollapse}
                    onExited={this.enableScrollBarAfterCollapse}
                    onEntered={this.enableScrollBarAfterCollapse}>
            <ul ref="systemList" className="system-list" style={{
              maxHeight: (this.props.maxHeight - SYSTEM_LIST_BUFFER_SPACE) + 'px'}
            }>
              <li className="system-list-item nav-text" onClick={this.onSelectSystem} id="0">
                GEN X
              </li>
              {this.renderGenxMenuItems()}
            </ul>
          </Collapse>
        </ul>
        <div className="nav-footer">
          <div className="nav-text" onClick={this.onRefresh}>
            <Glyphicon className="nav-icon-left" glyph="refresh"/>Refresh
          </div>
        </div>
      </div>
    );
  }

  // renderMenuItem(label, id, depth, canToggle, onClick) {
    // const onItemClick = () => {
    //   canToggle && this.toggleSystemMenu();
    //   onClick && onClick();
    // }

    // depth = depth || 0;

    // const itemClassName = `nav-list-item nav-text nav-item-depth-${depth}`

    // return (
    //   <li className={itemClassName} onClick={onItemClick}>
    //     {label}
    //   </li>
    // )
  // }

  renderGenxMenuItems() {
    let menuItems = [];
    for (let i=0; i < this.props.rmCount; i++) {
      menuItems.push(
        <li className="system-list-item nav-text" id={i + 1} key={i + 1} onClick={this.onSelectSystem}>
          {`RM${i+1}`}
        </li>
      );
    }
    return menuItems;
  };
}

const mapStateToProps = (state) => {
  return {
    rmCount: selectRmCountForGenX(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onRefresh: () => dispatch(resetShadow()),
    onSelectSystem: (systemNo) => dispatch(setCurrentSystem(systemNo))
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(NavSideBar));

