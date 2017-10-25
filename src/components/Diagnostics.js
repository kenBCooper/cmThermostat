import React from 'react';
import { connect } from 'react-redux';
import { updateZone } from '../actions/AppActions';
import { Table, Button } from 'react-bootstrap';

import LoadingIndicator from './LoadingIndicator';
import ThermostatActionIcon from './ThermostatActionIcon';
import LockIcon from './LockIcon';
import { 
  getDiagnosticForCurrentSystem,
  getZonesForCurrentSystem
} from '../util/deviceShadowUtil';

import './Table.css';
import './List.css';
import './Diagnostics.css';

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

const SA_ZONE_STATUS_DISPLAY_STRINGS = {
  0: 'STAT OK',
  1: 'NO DAMPER',
  2: 'STAT RF ERROR / DEAD BAT',
  3: 'STAT LOW BAT',
}

const STANDALONE_VALUE = '2';
const LONG_TEXT_CUTOFF = 4;

const Diagnostics = (props) => {
  const diagnostics = getDiagnosticForCurrentSystem(props.deviceShadow);
  const zones = getZonesForCurrentSystem(props.deviceShadow)
  if (!diagnostics || !zones) {
    return <LoadingIndicator />;
  } else {
    // There are two ways to use this function, either give the current lock status
    // (currLockStatus) rely on the funtion to automatically toggle to the opposite
    // lock status, or explicitly pass in a lock status to set the zone to (setToLockStatus).
    const toggleZoneLock = (zoneId, currLockStatus, setToLockStatus) => {
      let nextLockStatus;
      if (setToLockStatus) {
        nextLockStatus = setToLockStatus;
      } else {
        nextLockStatus = currLockStatus === '0' ? '1' : '0';
      }

      props.onZoneUpdate( nextLockStatus, 'lockStatus', zoneId );
    }

		const unlockAllZones = () => {
			Object.keys(zones).forEach((zoneId) => {
				toggleZoneLock(zoneId, undefined, '0' );
			});
		};

		const lockAllZones = () => {
			Object.keys(zones).forEach((zoneId) => {
				toggleZoneLock(zoneId, undefined, '1');
			});
		};

    const renderSystemDiagnosticTempItem = (value, headerText) => {
      return (
        <div className="system-diagnostic-item">
          <div className="system-diagnostic-item-header">{headerText}:</div>
          <div className="system-diagnostic-item-value">{value}</div>
        </div>
      );
    }

    // For the status section - we either have text values (VENT, CHANGEOVER, etc.),
    // or we show the heat/cool icon.
    const renderSystemDiagnosticStatusItem = (value, headerText) => {
      let heatCoolIcon = undefined;
      // Cool symbol
      if (value === STATUS_DISPLAY_STRINGS[2]) {
        heatCoolIcon = (
          <ThermostatActionIcon medium={true} showCool={true} />
        );
      }
      // Heat symbol
      if (value === STATUS_DISPLAY_STRINGS[3]) {
        heatCoolIcon = (
          <ThermostatActionIcon medium={true} showHeat={true} />
        );
      }

      return (
        <div className="system-diagnostic-item">
          <div className="system-diagnostic-item-header">{headerText}:</div>
          <div className={
            "system-diagnostic-item-value" + (value.length > LONG_TEXT_CUTOFF ? ' long-text' : '')
          }>
            {heatCoolIcon ? heatCoolIcon : value}
          </div>
        </div>
      );
    }

    const renderSystemDiagnostics = (diagnostics) => {
      return (
        <div>
          <span className="custom-list-header">System Diagnostics</span>
          <ul className="custom-list system-diagnostic-list">
            <li>{renderSystemDiagnosticTempItem(`${diagnostics.leavingAir}°`, 'Leaving Air')}</li>
            <li>{renderSystemDiagnosticTempItem(`${diagnostics.returnAir}°`, 'Return Air')}</li>
            <li>{renderSystemDiagnosticTempItem(`${diagnostics.outsideAir}°`, 'Outside Air')}</li>
            <li>{
              renderSystemDiagnosticStatusItem(
                getStatusDisplay(diagnostics.systemStatus),
                'Status',
              )
            }</li>
          </ul>
        </div>
      );
    };

    const renderSaStatDiagnostics = (zones) => {
      const hasSaStat = Object.keys(zones).some((zoneId) => {
        return zones[zoneId].standaloneThermostat === STANDALONE_VALUE
      });
      if (!hasSaStat) return '';

      return (
        <Table className='custom-table'>
          <thead className='custom-table-heading'>
            <tr>
              <th className='custom-table-heading-cell'>SA Stat</th>
              <th className='custom-table-heading-cell'>Humidity</th>
              <th className='custom-table-heading-cell'>Leaving Air</th>
              <th className='custom-table-heading-cell'>Return Air</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(zones).map((zoneId, index) => {
              if (zones[zoneId].standaloneThermostat === STANDALONE_VALUE) {
                const saStatZone = zones[zoneId];
                return (
                  <tr key={index}>
                    <td className="custom-table-cell">{zoneId}</td>
                    <td className="custom-table-cell">{`${saStatZone.humidity}%`}</td>
                    <td className="custom-table-cell">{`${saStatZone.leavingAir}°`}</td>
                    <td className="custom-table-cell">{`${saStatZone.returnAir}°`}</td>
                  </tr>
                );
              } else {
                return undefined;
              }
            })}
          </tbody>
        </Table>
      );
    }

    const getZoneVoteString = (priority, callCode) => {
      return (
        <span>
          {`${priority} - `}<i>{`${getStatusDisplay(callCode)}`}</i>
        </span>
      );
    }

    const getZoneStatusDisplay = (zone, diagnosticCode) => {
      if (zone.standaloneThermostat === STANDALONE_VALUE) {
        return SA_ZONE_STATUS_DISPLAY_STRINGS[diagnosticCode];
      } else {
        return ZONE_STATUS_DISPLAY_STRINGS[diagnosticCode];
      }
    }

    return (
      <div className="diagnostics-container">
        {renderSystemDiagnostics(diagnostics)}
        <Table className='custom-table'>
          <thead className='custom-table-heading'>
            <tr>
              <th className='custom-table-heading-cell'>Zone</th>
              <th className='custom-table-heading-cell'>Priority Votes</th>
              <th className='custom-table-heading-cell'>Locked/Unlocked</th>
              <th className='custom-table-heading-cell zone-status'>Status</th>
            </tr>
          </thead>
          <tbody>
						{Object.keys(zones).map((zoneId, index) => {
							const zoneStatusDiagnosticKey = `errorCodeZone${zoneId}`;
							const zoneStatusDiagnosticCode = diagnostics[zoneStatusDiagnosticKey];
							const zoneStatusDisplay = getZoneStatusDisplay(zones[zoneId], zoneStatusDiagnosticCode);
							const zoneStatusLocked = zones[zoneId].lockStatus;
              const zonePriority = zones[zoneId].priorityVote;
              const zoneCall = zones[zoneId].zoneCall;
							return(
								<tr key={index}>
                  <td className="custom-table-cell">{`${zoneId}`}</td>
									<td className="custom-table-cell">{getZoneVoteString(zonePriority, zoneCall)}</td>
									<td onClick={() => toggleZoneLock(zoneId, zoneStatusLocked)}
                      className="custom-table-cell zone-lock">
                    <LockIcon lockStatus={zoneStatusLocked}/>
                  </td>
									<td className="custom-table-cell zone-status">{`${zoneStatusDisplay}`}</td>
								</tr>
							)
						})}
          </tbody>
        </Table>
        <div className="lock-button-group">
          <Button onClick={unlockAllZones.bind(this)} block>Unlock All</Button>
          <Button onClick={lockAllZones.bind(this)} block>Lock All</Button>
        </div>
        {renderSaStatDiagnostics(zones)}
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
