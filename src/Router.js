import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';

import ZoneList from './components/ZoneList';
import ZoneDetail from './components/ZoneDetail';

const Router = () => {
    return (
        <BrowserRouter>
            <div>
                <Route exact path="/" component={ZoneList}/>
                <Route path="/:zoneId" component={ZoneDetail}/>
            </div>
        </BrowserRouter>
    );
}

export default Router;



