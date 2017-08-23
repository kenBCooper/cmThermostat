import React from 'react';
import { connect } from 'react-redux';
import { Panel, Table } from 'react-bootstrap';

import LoadingIndicator from './LoadingIndicator';
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

const Diagnostics = (props) => {
  const diagnostics = getDiagnosticForCurrentSystem(props.deviceShadow);
  const zones = getZonesForCurrentSystem(props.deviceShadow)
  if (!diagnostics || !zones) {
    return <LoadingIndicator />;
  } else {
    return (
      <div>
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
                <th className='custom-table-heading-cell'>Thermostat Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(zones).map((zoneId, index) => {
                const zoneStatusDiagnosticKey = `errorCodeZone${zoneId}`;
                const zoneStatusDiagnosticCode = diagnostics[zoneStatusDiagnosticKey];
                const zoneStatusDisplay = ZONE_STATUS_DISPLAY_STRINGS[zoneStatusDiagnosticCode];
                return(
                  <tr key={index}>
                    <td>{`${zoneId}: ${zoneStatusDisplay}`}</td>
                  </tr>
                )
              })}
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

export default connect(mapStateToProps)(Diagnostics);
