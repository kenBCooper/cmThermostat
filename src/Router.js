import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';

import ZoneList from './components/ZoneList';
import ZoneDetail from './components/ZoneDetail';
import NavHeader from './components/NavHeader';
import Diagnostics from './components/Diagnostics';

const Router = () => {
    return (
      <BrowserRouter>
          <div>
              <NavHeader />
              <div className="container">
                <Route exact path="/" component={ZoneList}/>
                <Route path="/d" component={Diagnostics}/>
                <Route path="/:zoneId" component={ZoneDetail}/>
              </div>
          </div>
      </BrowserRouter>
    );
}

export default Router;



