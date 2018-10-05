import React from 'react';
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux';

import { selectCurrentSystemName } from '../selectors/AppSelectors';

import './NavHeader.css';

const NavHeader = (props) => {
  const handleNavigation = (event) => {
    event.preventDefault();
    props.history.push(event.target.pathname)
  }

  const isCurrentPath = (path) => {
    return props.location.pathname === path;
  }

  const zonesPath = '/zones';
  const diagnosticsPath = '/diagnostics';
  const schedulePath = '/schedule';
  const settingsPath = '/settings';

  const applyClassIfCurrentSelection = (applyClass, baseClass, path) => {
    if (isCurrentPath(path)) {
      return baseClass + applyClass;
    } else {
      return baseClass
    }
  }

  const renderSelectionArrow = (path) => {
    return isCurrentPath(path) ? (<div className="selected-arrow"></div>) : '';
  }

  return (
    <div className="nav-header">
      <ul className="nav-header-list">
        <li className="nav-header-list-item nav-header-system-name"><i>{props.currentSystemName}:</i></li>
        <li className={applyClassIfCurrentSelection(" selected", "nav-header-list-item", zonesPath)}>
          <i><a href={zonesPath} onClick={handleNavigation}>Zones</a></i>
          {renderSelectionArrow(zonesPath)}
        </li>
        <li className={applyClassIfCurrentSelection(" selected", "nav-header-list-item", diagnosticsPath)}>
          <i><a href={diagnosticsPath} onClick={handleNavigation}>Diagnostics</a></i>
          {renderSelectionArrow(diagnosticsPath)}
        </li>
        <li className={applyClassIfCurrentSelection(" selected", "nav-header-list-item", schedulePath)}>
          <i><a href={schedulePath} onClick={handleNavigation}>Schedule</a></i>
          {renderSelectionArrow(schedulePath)}
        </li>
        <li className={applyClassIfCurrentSelection(" selected", "nav-header-list-item", settingsPath)}>
          <i><a href={settingsPath} onClick={handleNavigation}>Settings</a></i>
          {renderSelectionArrow(settingsPath)}
        </li>
      </ul>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    currentSystemName: selectCurrentSystemName(state),
  }
}

export default withRouter(connect(mapStateToProps, undefined)(NavHeader));
