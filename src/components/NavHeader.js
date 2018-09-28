import React from 'react';
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux';

import { selectCurrentSystemNumber } from '../selectors/AppSelectors';

import './NavHeader.css';

const NavHeader = (props) => {
  const handleNavigation = (event) => {
    event.preventDefault();
    props.history.push(event.target.pathname)
  }

  const isCurrentPath = (path) => {
    return props.location.pathname === path;
  }

  const zonesPath = '/z';
  const diagnosticsPath = '/d';
  const schedulePath = '/s';

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

  const getSystemName = () => {
    const currentSystemNumber = props.currentSystemNumber

    if (currentSystemNumber === 0) {
      return 'GEN X';
    } else {
      return `RM${currentSystemNumber}`;
    }
  }

  return (
    <div className="nav-header">
      <ul className="nav-header-list">
        <li className="nav-header-list-item nav-header-system-name"><i>{getSystemName()}:</i></li>
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
      </ul>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    currentSystemNumber: selectCurrentSystemNumber(state),
  }
}

export default withRouter(connect(mapStateToProps, undefined)(NavHeader));
