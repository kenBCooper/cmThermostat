import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  selectNamesForCurrentSystem,
  selectIsCurrentSystemCelsius,
  selectZoneCountForCurrentSystem,
} from '../selectors/AppSelectors';
import { updateTempFormat, updateZoneName } from '../actions/AppActions';

import './List.css';
import './Settings.css';

class Settings extends Component {
  state = {
    nameEditText: {},
  };

  onToggleTempFormat = () => {
    if (this.props.isCelsius) {
      this.props.onUpdateTempFormat('0');
    } else {
      this.props.onUpdateTempFormat('1');
    }
  }

  onZoneNameEdit = (zoneNumber, name) => {
    const nameEditText = { ...this.state.nameEditText };
    nameEditText[zoneNumber] = name;

    this.setState({
      nameEditText,
    });
  }

  onZoneNameCancelEdit = (zoneNumber) => {
    const nameEditText = { ...this.state.nameEditText };
    delete nameEditText[zoneNumber];

    this.setState({
      nameEditText,
    });
  }

  onZoneNameInputKeyPress = (event, zoneNumber) => {
    if (event.key === 'Enter') {
      this.onSaveZoneName(zoneNumber)
    }

    if (event.target.value.length > 19) {
      event.preventDefault()
    }
  }

  onSaveZoneName = (zoneNumber) => {
    let zoneName = this.state.nameEditText[zoneNumber].trim();

    if (!zoneName) {
      this.onZoneNameCancelEdit(zoneNumber);
      return;
    }

    if (zoneName.length > 20) {
      zoneName = zoneName.slice(0,20);
    }

    if (zoneNumber !== 0 && zoneNumber !== '0') {
      zoneName = `${zoneNumber}: ${zoneName}`;
    }

    this.props.onUpdateZoneName(zoneNumber, zoneName);
    this.onZoneNameCancelEdit(zoneNumber);
  }

  render() {
    return (
      <div>
        <div className="custom-list-header">Settings</div>
        <div className="settings-section-label">Temp. Display Format:</div>
        {this.renderTempFormatToggle()}
        <div className="custom-list-header">Custom Naming</div>
        {this.renderNamesForSystem()}
      </div>
    );
  }

  renderTempFormatToggle() {
    const isCelsius = this.props.isCelsius;
    const farenheightLabelSelectedClass = isCelsius ? '' : ' selected-format';
    const celsiusLabelSelectedClass = isCelsius ? ' selected-format' : '';

    return (
      <div className="temp-format-container">
        <div className={`temp-format-label${farenheightLabelSelectedClass}`}>°F</div>
        <label className="temp-format-switch">
          <input
            type="checkbox"
            checked={isCelsius}
            onChange={this.onToggleTempFormat}
          />
          <span className="temp-format-slider"></span>
        </label>
        <div className={`temp-format-label${celsiusLabelSelectedClass}`}>°C</div>
      </div>
    );
  }

  renderNamesForSystem() {
    const systemName = this.props.namesForCurrentSystem[0];
    const zoneNames = Object.values(this.props.namesForCurrentSystem).slice(1);

    return (
      <div>
        <div className="settings-section-label">System Name:</div>
        {this.renderNameRow(0, systemName)}
        <div className="settings-section-label">Zone Names:</div>
        {zoneNames.map((name) => {
          // Some name strings were malformed and had extra commas at the end,
          // creating 'empty' names ('') that need to be handled here.
          if (!name) return null;
          const zoneNumber = parseInt(name.split(':')[0], 10);
          const displayName = name.substring(name.indexOf(':')+1).trim();
          return this.renderNameRow(zoneNumber, displayName);
        })}
      </div>
    );
  }

  renderNameRow(zoneNumber, name) {
    // If a zone is currently being edited, we want to use that version of the name
    const editingName = this.state.nameEditText[zoneNumber];

    if (editingName || editingName === '') {
      name = editingName;
    }

    return (
      <div className="name-list-row" key={zoneNumber}>
        {this.renderNameLabel(zoneNumber, name)}
        {this.renderNameEditOptions(zoneNumber, name)}
      </div>
    );
  }

  renderNameLabel(zoneNumber, name) {
    const isEditing = Object.keys(this.state.nameEditText).includes(zoneNumber.toString());
    const nameLabel = `${zoneNumber ? `${zoneNumber}: ` : ''}${name}`;

    if (isEditing) {
      return (
        <div className="name-list-textEdit-container">
          <span>{zoneNumber ? `${zoneNumber}: ` : ''}</span>
          <input
            type="text"
            className="name-list-textEdit"
            value={name}
            onChange={(e) => this.onZoneNameEdit(zoneNumber, e.target.value)}
            onKeyPress={(e) => this.onZoneNameInputKeyPress(e, zoneNumber)}
          />
        </div>
      )
    } else {
      return (
        <div className="name-list-label">{nameLabel}</div>
      );
    }
  }

  renderNameEditOptions(zoneNumber, name) {
    const isEditing = Object.keys(this.state.nameEditText).includes(zoneNumber.toString());

    if (isEditing) {
      return (
        [
          <div
            key="save"
            className="name-list-edit-button"
            onClick={() => this.onSaveZoneName(zoneNumber)}>
              Save
          </div>,
          <div
            key="cancel"
            className="name-list-edit-button"
            onClick={() => this.onZoneNameCancelEdit(zoneNumber)}>
              Cancel
          </div>
        ]  
      );
    } else {
      return (
        <div
          className="name-list-edit-button"
          onClick={() => this.onZoneNameEdit(zoneNumber, name)}>
            Edit
        </div>
      );
    }
  }
}

const mapStateToProps = (state) => {
  const zoneCount = selectZoneCountForCurrentSystem(state)
  const namesForCurrentSystem = selectNamesForCurrentSystem(state);

  const namesForExistingZones = Object.keys(namesForCurrentSystem).reduce((namesObj, zoneNumber) => {
    if (zoneNumber <= zoneCount) {
      namesObj[zoneNumber] = namesForCurrentSystem[zoneNumber];
    }
    return namesObj;
  }, {});

  return {
    namesForCurrentSystem: namesForExistingZones,
    isCelsius: selectIsCurrentSystemCelsius(state),
  };
}

const mapDispatchToProps = (dispatch) => {
  return {
    onUpdateTempFormat: (tempFormat) => dispatch(updateTempFormat(tempFormat)),
    onUpdateZoneName: (zoneNumber, name) => dispatch(updateZoneName(zoneNumber, name)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
