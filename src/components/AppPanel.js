import React, { Component } from 'react';

import NavHeader from './NavHeader';
import NavSidebar from './NavSidebar';

import './AppPanel.css';

class AppPanel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      maxSidebarHeight: undefined,
    }
  }

  componentDidMount() {
    window.addEventListener('resize', () => {
      this.setState({
        maxSidebarHeight: this.refs.appPanel.clientHeight,
      });
    });

    this.setState({
      maxSidebarHeight: this.refs.appPanel.clientHeight,
    });
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => {
      this.setState({
        maxSidebarHeight: this.refs.appPanel.clientHeight,
      });
    });
  }

  render() {
    return (
      <div ref="appPanel" className={this.props.isLoggedIn ? "app-panel" : ""}>
        {this.props.isLoggedIn ? (
          <div className="app-panel-header">
            <NavHeader />
          </div>
        ) : null}
        {this.props.isLoggedIn ? (
          <div className="app-panel-sidebar">
            <NavSidebar maxHeight={this.state.maxSidebarHeight}/>
          </div>
        ) : null}
        <div className="app-panel-workspace">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default AppPanel;