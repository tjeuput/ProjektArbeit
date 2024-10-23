import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import DienstpA from '../Pages/DientspA';
import DienstpBw from '../Pages/DientspBw';
import EinzelA from '../Pages/EinzelA';
import DienstpHw from '../Pages/DientspHw';
import EinzelHw from '../Pages/EinzelHw';
import EinzelBw from '../Pages/EinzelBw';
import Mitarbeiter from '../Pages/Mitarbeiter';
import Bereich from '../Pages/Bereich';
import Gruppe from '../Pages/Gruppe';
import Schichtart from '../Pages/Schichtart';

const Pages = [
    { path: 'DienstpA', component: <DienstpA /> },
    { path: 'DienstpBw', component: <DienstpBw /> },
    { path: 'EinzelA', component: <EinzelA /> },
    { path: 'DienstpHw', component: <DienstpHw /> },
    { path: 'EinzelHw', component: <EinzelHw /> },
    { path: 'EinzelBw', component: <EinzelBw /> },
    { path: 'Mitarbeiter', component: <Mitarbeiter/>},
    { path: 'Bereich', component: <Bereich/>},
    { path: 'Gruppe', component: <Gruppe/>},
    { path: 'Schichtart', component: <Schichtart/>}
  ];
  
  const AppRouter: React.FC = () => (
    <Routes>
      <Route path="/" element={<Navigate to="/DienstpBw" replace />} />
      {Pages.map((Page, index) => (
        <Route key={index} path={`/${Page.path}`} element={Page.component} />
      ))}
    </Routes>
  );

export default AppRouter;