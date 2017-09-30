import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Nav, NavItem, NavDropdown, MenuItem, Table } from 'react-bootstrap';
import TimeInput from 'react-time-input';
import { updateZone } from '../actions/AppActions';

// import LoadingIndicator from './LoadingIndicator';
import {
  getZonesForCurrentSystem,
  getSchedulesForCurrentSystem,
} from '../util/deviceShadowUtil';
import { DAY_NAMES } from '../constants/ScheduleConstants';

import './Panel.css';
import './Table.css';
import './Schedule.css';

class Schedule extends Component {
	state = {
		eventKey: '1.1',
  }

	handleSelect = (eventKey) => {
		this.setState({ eventKey });
	}

	render = () => {
		// can all of this be moved into a constructor?
    const zones = getZonesForCurrentSystem(this.props.deviceShadow);
    const schedules = getSchedulesForCurrentSystem(this.props.deviceShadow);
    console.log(schedules);

		const zoneIds = Object.keys(zones);
		const zoneChoices = ["All", ...zoneIds];

		let dayChoices = ["All"];
		if (this.state.eventKey === '1.1') {
			const days = Object.keys(DAY_NAMES);
			dayChoices = [...dayChoices, ...days];
		} else {
			dayChoices = [...dayChoices, "Weekday", "Sat", "Sun"];
		}

		return (
			<div>
				<Nav bsStyle="tabs" activeKey="1" onSelect={this.handleSelect}>
					<NavDropdown eventKey="1" title="Edit Weekly Schedule" id="nav-dropdown">
						<MenuItem eventKey="1.1">By Day</MenuItem>
						<MenuItem eventKey="1.2">By Weekday/Sat/Sun</MenuItem>
					</NavDropdown>
					<NavItem eventKey="2">Vacation Placeholder</NavItem>
				</Nav>
				<Table responsive>
					<thead>
						<tr>
							<th key={0}>Zone / Day(s)</th>
							{dayChoices.map( (dayChoice, index) => {
								return (
									<th key={index+1}>{dayChoice}</th>
								)}
							)}
						</tr>
					</thead>
					<tbody>
						{zoneChoices.map( (zoneChoice, index) => {
							return (
								<tr key={index}>
									<td key={0}>{zoneChoice}</td>
									{dayChoices.map( (dayChoice, ind) => {
										// schedule = this.determineSchedule(schedules, zoneChoice, dayChoice);
										// if (dayChoice === 'All') { return (<td key={ind+1}>All</td>) };
										if (dayChoice === 'All') { 
											return (<td key={ind+1}>{this.renderAllTimePicker(schedules, zoneChoice)}</td>) };
											// return (<td key={ind+1}><renderAllTimePicker schedules={schedules} zoneChoice={zoneChoice} /></td>) };
										if (dayChoice === 'Weekday') { return (<td key={ind+1}>All</td>) };
										if (zoneChoice === 'All') { return (<td key={ind+1}>All</td>) };
										const schedule = schedules[zoneChoice][dayChoice];
										return (
											<td key={ind+1}>
												{this.renderStartEndTimePicker(schedule, zoneChoice, dayChoice)}
											</td>
										);
									}
									)}
								</tr>
							)}
						)}
					</tbody>
				</Table>
				<div><p>Vacation Placeholder!</p></div>
			</div>
		);
	}

	// determineSchedule = (schedules, zoneChoice, dayChoice) => {
	// 	if (Object.keys(DAY_NAMES).find( (day) => {
	// 		return day === dayChoice
	// 	} )) {
	// 		if (zoneChoice === 'All') {
	// 			schedule = schedules[zones[0]][dayChoice];
	// 			Object.keys(zones).forEach( (zoneId) => {
	// 				if (schedule != )
	// 			}
	// 			
	// 			return schedule;
	// 		else {
	// 			return schedules[zoneChoice][dayChoice];
	// 		}
	// 	} else {
	// 		if (dayChoice === 'Weekday') {
	// 			if (zoneChoice === 'All') {
  //
	// 			} else {
  //
	// 			}
	// 		} else {
	// 			// dayChoice must be 'All'
	// 		}
	// 	}
	// }

	renderStartEndTimePicker(schedule, zoneChoice, dayChoice) {
		return (
			<div>
				Start:
				<TimeInput initTime={`${schedule.startHour}:${schedule.startMinute}`}
					className="time-input"
					onTimeChange={(value) => this.updateStartTime(value, zoneChoice, dayChoice)}/>
				<select value={schedule.startAmPm} onChange={(event) => this.updateStartAmPm(event.target.value, zoneChoice, dayChoice)}>
					<option value={"AM"}>AM</option>
					<option value={"PM"}>PM</option>
				</select>
				<br/>
				End:
				<TimeInput initTime={`${schedule.endHour}:${schedule.endMinute}`}
					className="time-input"
					onTimeChange={(value) => this.updateEndTime(value, zoneChoice, dayChoice)}/>
				<select value={schedule.endAmPm} onChange={(event) => this.updateEndAmPm(event.target.value, zoneChoice, dayChoice)}>
					<option value="AM">AM</option>
					<option value="PM">PM</option>
				</select>
				<br/>
			</div>
		);
	}

	renderAllTimePicker = (schedules, zoneChoice) => {
		if (zoneChoice === 'All') return <div></div>;
		let allSchedules = {};
		Object.keys(schedules[zoneChoice][Object.keys(schedules[zoneChoice])[0]]).forEach( (startOrEndTime) => {
			console.log('StartOrEndTime', startOrEndTime);
			allSchedules[startOrEndTime] = this.allEqual(schedules[zoneChoice],startOrEndTime);
		} );
		console.log('All schedules: ', allSchedules);
		return (
			<div>
				Start:
				<TimeInput initTime={`${allSchedules.startHour}:${allSchedules.startMinute}`}
					className="time-input"
					onTimeChange={(value) => this.updateAllStartTimes(value, zoneChoice)}/>
				<select value={allSchedules.startAmPm} onChange={(event) => this.updateAllStartAmPm(event.target.value, zoneChoice)}>
					<option value="AM">AM</option>
					<option value="PM">PM</option>
					<option value=""></option>
				</select>
				<br/>
				End:
				<TimeInput initTime={`${allSchedules.endHour}:${allSchedules.endMinute}`}
					className="time-input"
					onTimeChange={(value) => this.updateAllEndTime(value, zoneChoice)}/>
				<select value={allSchedules.endAmPm} onChange={(event) => this.updateAllEndAmPm(event.target.value, zoneChoice)}>
					<option value="AM">AM</option>
					<option value="PM">PM</option>
					<option value=""></option>
				</select>
				<br/>
			</div>
		)
	}

	allEqual = (zoneSchedule,startOrEndTime) => {
		const zoneScheduleKeys = Object.keys(zoneSchedule);
		const firstDayVal = zoneSchedule[zoneScheduleKeys[0]][startOrEndTime];
		console.log('zone schedule: ', zoneSchedule);
		console.log('startOrEndTime: ', startOrEndTime);
		console.log('firstDayVal: ', firstDayVal);
		const allEq = zoneScheduleKeys.map( (day) => {

			console.log('day: ', day);
			console.log(zoneSchedule[day][startOrEndTime]);
			if (zoneSchedule[day][startOrEndTime] === firstDayVal) return true;
			console.log('false');
			return false;
		} ).reduce( (allEqual, equal) => {
			if(allEqual && equal) return true;
			return false;
		}, true);
		return allEq ? firstDayVal : "";
	}

	updateStartTime = (value, zoneChoice, dayChoice) => {
		let [hour, minute] = value.split(":")
		this.props.onZoneUpdate(hour, `${DAY_NAMES[dayChoice]}OccupiedHour`, zoneChoice);
		this.props.onZoneUpdate(minute, `${DAY_NAMES[dayChoice]}OccupiedMinute`, zoneChoice);
	}
	updateStartAmPm = (value, zoneChoice, dayChoice) => {
		const value_int = (value === 'PM' ? 1 : 0);
		this.props.onZoneUpdate(value_int, `${DAY_NAMES[dayChoice]}OccupiedAmPm`, zoneChoice);
	}
	updateEndTime = (value, zoneChoice, dayChoice) => {
		let [hour, minute] = value.split(":")
		this.props.onZoneUpdate(hour, `${DAY_NAMES[dayChoice]}UnoccupiedHour`, zoneChoice);
		this.props.onZoneUpdate(minute, `${DAY_NAMES[dayChoice]}UnoccupiedMinute`, zoneChoice);
	}
	updateEndAmPm = (value, zoneChoice, dayChoice) => {
		const value_int = (value === 'PM' ? 1 : 0);
		this.props.onZoneUpdate(value_int, `${DAY_NAMES[dayChoice]}UnoccupiedAmPm`, zoneChoice);
	}
	updateAllStartTimes = (value, zoneChoice) => {
		Object.keys(DAY_NAMES).forEach( (day) => {
			this.updateStartTime(value, zoneChoice, day);
		} )
	}
	updateAllStartAmPm = (value, zoneChoice) => {
		Object.keys(DAY_NAMES).forEach( (day) => {
			this.updateStartAmPm(value, zoneChoice, day);
		} )
	}
	updateEndTimes = (value, zoneChoice) => {
		Object.keys(DAY_NAMES).forEach( (day) => {
			this.updateEndTime(value, zoneChoice, day);
		} )
	}
	updateEndAmPm = (value, zoneChoice) => {
		Object.keys(DAY_NAMES).forEach( (day) => {
			this.updateEndAmPm(value, zoneChoice, day);
		} )
	}
}

const mapStateToProps = (state) => {
	return {
		deviceShadow: state.shadow,
	}
};
const mapDispatchToProps = (dispatch) => {
  return {
    onZoneUpdate: (value, zoneAttribute, zoneId) => 
      dispatch(updateZone(value, zoneAttribute, zoneId))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
