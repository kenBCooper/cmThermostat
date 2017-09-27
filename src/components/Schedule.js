import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Panel, Table } from 'react-bootstrap';
import TimeInput from 'react-time-input';

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
    displayZone: 1,
  }

  onZoneSelectionChange = (event) => {
    this.setState({displayZone: parseInt(event.target.value, 10)});
  }

  render() {
    const zones = getZonesForCurrentSystem(this.props.deviceShadow);
    const schedules = getSchedulesForCurrentSystem(this.props.deviceShadow);
    console.log(schedules);
    return (
      <div>
        <Panel>
          <select value={this.state.displayZone} onChange={this.onZoneSelectionChange}>
            {Object.keys(zones).map((zoneNumber) => {
              return (
                <option key={zoneNumber} value={zoneNumber}>
                  {zoneNumber}
                </option>
              );
            })};
          </select>
          <Table bordered>
            <thead>
              <tr>
                {Object.keys(DAY_NAMES).map((dayName) => {
                  return <th key={dayName}>{dayName}</th>
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Object.keys(DAY_NAMES).map((dayName, i) => {
                  const daySchedule = schedules[this.state.displayZone][dayName];
                  return (
                    <td key={i}>
                      {this.renderStartEndTimePicker(daySchedule)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </Table>
        </Panel>
        <div><p>Vacation Placeholder!</p></div>
      </div>
    );
  }

  renderStartEndTimePicker(schedule) {
    return (
      <div>
        Start:
        <TimeInput initTime={`${schedule.startHour}:${schedule.startMinute}`}
                   className="time-input"
                   onTimeChange={() => console.log('did a time thing!')}/>
        <select value={schedule.startAmPm}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <br/>
        End:
        <TimeInput initTime={`${schedule.endHour}:${schedule.endMinute}`}
                   className="time-input"
                   onTimeChange={() => console.log('did a time thing!')}/>
        <select value={schedule.endAmPm}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <br/>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
    return {
        deviceShadow: state.shadow,
    }
};

export default connect(mapStateToProps)(Schedule);