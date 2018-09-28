import React, { Component } from 'react';
import { Nav, NavItem } from 'react-bootstrap';

import WeeklySchedule from './WeeklySchedule.js';
import Vacations from './Vacations.js';

import './Schedule.css';

class Schedule extends Component {
  state = {
    activeKey: '1',
  }

  handleSelect = (eventKey) => {
    this.setState({ activeKey: eventKey });
  }

  render = () => {
    return (
      <div className="schedule-container">
        <Nav className="schedule-tabs"
             bsStyle="tabs"
             activeKey={this.state.activeKey}
             onSelect={this.handleSelect}>
          <NavItem eventKey="1">Weekly Schedule</NavItem>
          <NavItem eventKey="2">Vacations</NavItem>
        </Nav>
        <div className="schedule-content-container">
          {this.state.activeKey === "1" ?
            (<WeeklySchedule />) : 
            (<Vacations />)
          }
        </div>
      </div>
    );
  }
}

export default Schedule;
