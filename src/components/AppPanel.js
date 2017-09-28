import React from 'react';

import NavHeader from './NavHeader';
import NavSidebar from './NavSidebar';

import './AppPanel.css';

const AppPanel = (props) => {
  return (
    <div className={props.isLoggedIn ? "app-panel" : ""}>
      {props.isLoggedIn ? (<div className="app-panel-header"><NavHeader /></div>) : null}
      {props.isLoggedIn ? (<div className="app-panel-sidebar"><NavSidebar /></div>) : null}
      <div className="app-panel-workspace">
        {props.children}
      </div>
    </div>
  );
}

export default AppPanel;