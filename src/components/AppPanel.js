import React, { Component } from 'react';

import NavHeader from './NavHeader';
import NavSidebar from './NavSidebar';

import './AppPanel.css';

class AppPanel extends Component {
  render() {
    return (
      <div className={this.props.isLoggedIn ? "app-panel-container" : ""}>
        <div ref="appPanel" className={this.props.isLoggedIn ? "app-panel" : ""}>
          {this.props.isLoggedIn ? (
            <div className="app-panel-header">
              <NavHeader />
            </div>
          ) : null}
          {this.props.isLoggedIn ? (
            <div className="app-panel-sidebar">
              <NavSidebar />
            </div>
          ) : null}
          <div className="app-panel-workspace">
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}

export default AppPanel;
