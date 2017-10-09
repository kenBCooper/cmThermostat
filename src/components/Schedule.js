import React, { Component } from 'react';
import { Nav, NavItem } from 'react-bootstrap';

import UnderDevelopmentBanner from './UnderDevelopmentBanner';

import WeeklySchedule from './WeeklySchedule.js';
import Vacations from './Vacations.js';

class Schedule extends Component {
	state = {
		activeKey: '1',
  }

	handleSelect = (eventKey) => {
		this.setState({ activeKey: eventKey });
	}

	render = () => {
		return (
			<div>
				<UnderDevelopmentBanner />
				<Nav bsStyle="tabs" activeKey={this.state.activeKey} onSelect={this.handleSelect}>
					<NavItem eventKey="1">Weekly Schedule</NavItem>
					<NavItem eventKey="2">Vacations</NavItem>
				</Nav>
				{this.state.activeKey === "1" ?
						( <WeeklySchedule /> ) : 
						( <Vacations /> )
				}
			</div>
		);
	}
}

export default Schedule;
