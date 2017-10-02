import React from 'react';
import { connect } from 'react-redux';
import { updateZone } from '../actions/AppActions';
import { Panel, Table, ToggleButtonGroup, ToggleButton, Button } from 'react-bootstrap';

import LoadingIndicator from './LoadingIndicator';
import UnderDevelopmentBanner from './UnderDevelopmentBanner';
import { 
  getDiagnosticForCurrentSystem,
  getZonesForCurrentSystem
} from '../util/deviceShadowUtil';

import './Panel.css';
import './Table.css';

const STATUS_DISPLAY_STRINGS = {
  0: 'OFF',
  1: 'VENT',
  2: 'COOL',
  3: 'HEAT',
  4: 'CHANGEOVER',
  5: 'AIR BALANCE',
}

const ZONE_STATUS_DISPLAY_STRINGS = {
  0: 'DAMPER & STAT OK',
  1: 'NO DAMPER',
  2: 'STAT RF ERROR / DEAD BAT',
  3: 'STAT LOW BAT',
}

const LOCK_STATUS_DISPLAY_STRINGS = {
  0: 'UNLOCKED',
  1: 'LOCKED',
}

const Diagnostics = (props) => {
  const diagnostics = getDiagnosticForCurrentSystem(props.deviceShadow);
  const zones = getZonesForCurrentSystem(props.deviceShadow)
  if (!diagnostics || !zones) {
    return <LoadingIndicator />;
  } else {
		const setZoneLockStatus = (value, zoneId) => {
			props.onZoneUpdate( value.toString(), 'lockStatus', zoneId );
		}
		const unlockAllZones = () => {
			Object.keys(zones).forEach((zoneId) => {
				setZoneLockStatus( 0, zoneId );
			});
		};
		const lockAllZones = () => {
			Object.keys(zones).forEach((zoneId) => {
				setZoneLockStatus( 1, zoneId );
			});
		};

    return (
      <div>
        <UnderDevelopmentBanner />
        <Panel className="custom-panel">
          {diagnostics && (
            <Table fill className='custom-table'>
              <thead className='custom-table-heading'>
                <tr>
                  <th className='custom-table-heading-cell'>System Diagnostics</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{`Leaving air: ${diagnostics.leavingAir}°`}</td></tr>
                <tr><td>{`Return air: ${diagnostics.returnAir}°`}</td></tr>
                <tr><td>{`Outside air: ${diagnostics.outsideAir}°`}</td></tr>
                <tr><td>{`Main System Status: ${getStatusDisplay(diagnostics.systemStatus)}`}</td></tr>
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel className="custom-panel">
          <Table fill className='custom-table'>
            <thead className='custom-table-heading'>
              <tr>
                <th className='custom-table-heading-cell' colSpan="4">Thermostat Status</th>
              </tr>
            </thead>
            <tbody>
							{Object.keys(zones).map((zoneId, index) => {
								const zoneStatusDiagnosticKey = `errorCodeZone${zoneId}`;
								const zoneStatusDiagnosticCode = diagnostics[zoneStatusDiagnosticKey];
								const zoneStatusDisplay = ZONE_STATUS_DISPLAY_STRINGS[zoneStatusDiagnosticCode];
								const zoneStatusLocked = zones[zoneId].lockStatus;
								const zoneStatusLockedToggleButtonGroup = (
									<ToggleButtonGroup type="radio" name="locked" value={parseInt(zoneStatusLocked, 10)} onChange={(value) => setZoneLockStatus(value, zoneId)}>
										<ToggleButton value={0}>{LOCK_STATUS_DISPLAY_STRINGS[0]}</ToggleButton>
										<ToggleButton value={1}>{LOCK_STATUS_DISPLAY_STRINGS[1]}</ToggleButton>
									</ToggleButtonGroup>
								);
								let zoneSAStats;
								if (zones[zoneId].standaloneThermostat === '2' ? 'SA' : '') {
									zoneSAStats = (
										<div>
											<div>{`Humidity: ${zones[zoneId].humidity}%`}</div>
											<div>{`Leaving air: ${zones[zoneId].leavingAir}°`}</div>
											<div>{`Return air: ${zones[zoneId].returnAir}°`}</div>
										</div>
									);
								} else {
									zoneSAStats = (
										<div></div>
									);
								}
								return(
									<tr key={index}>
										<td>{zoneSAStats}</td>
										<td>{`${zoneId}: ${zoneStatusDisplay}`}</td>
										<td style={{textAlign:"right"}}>{zoneStatusLockedToggleButtonGroup}</td>
									</tr>
								)
							})}
							<tr className='all-unlock-lock-table-footer'>
								<td colSpan="2"><Button onClick={unlockAllZones.bind(this)} block>UNLOCK ALL</Button></td>
								<td colSpan="2"><Button onClick={lockAllZones.bind(this)} block>LOCK ALL</Button></td>
							</tr>
            </tbody>
          </Table>
        </Panel>
      </div>
    );
  }
}

const getStatusDisplay = (statusCode) => {
  return STATUS_DISPLAY_STRINGS[statusCode];
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

export default connect(mapStateToProps, mapDispatchToProps)(Diagnostics);
