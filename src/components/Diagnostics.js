import React from 'react';
import { connect } from 'react-redux';

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
  return (
    <div>
      <h1>System Diagnostics</h1>
      <br />
      {props.diagnostics && (
        <div>
          <h3>{`Leaving air: ${props.diagnostics.leavingAir}°`}</h3>
          <h3>{`Return air: ${props.diagnostics.returnAir}°`}</h3>
          <h3>{`Outside air: ${props.diagnostics.outsideAir}°`}</h3>
          <br />
          <h3>{`Main System Status: ${getStatusDisplay(props.diagnostics.systemStatus)}`}</h3>
          <br />
          <h3>Thermostat Status</h3>
          {Object.keys(props.zones).map((zoneId, index) => {
            const zoneStatusDiagnosticKey = `errorCodeZone${zoneId}`;
            const zoneStatusDiagnosticCode = props.diagnostics[zoneStatusDiagnosticKey];
            const zoneStatusDisplay = ZONE_STATUS_DISPLAY_STRINGS[zoneStatusDiagnosticCode];
            return(
              <h4 key={index}>{`${zoneId}: ${zoneStatusDisplay}`}</h4>
            )
          })}
        </div>
      )}
    </div>
  );
}

const getStatusDisplay = (statusCode) => {
  return STATUS_DISPLAY_STRINGS[statusCode];
}

const mapStateToProps = (state) => {
    return {
        diagnostics: state.shadow.diagnostics,
        zones: state.shadow.zones,
    }
};
export default connect(mapStateToProps)(Diagnostics);