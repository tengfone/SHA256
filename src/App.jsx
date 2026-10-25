import './App.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// Layout
import LandingPage from './layouts/LandingPage'

// Pages
import HomePage from './pages/Homepage'
import EncodePage from './pages/Encodepage'
import DecodePage from './pages/Decodepage'
import Header from './components/Header'
import Footer from './components/Footer'
import AboutPage from './pages/Aboutpage'

function App() {
  return (
    <div className="flex flex-col h-full">
      <Router>
        <Header />
        <Switch>
          <Route exact path='/'>
            <LandingPage>
              <HomePage />
            </LandingPage>
          </Route>
          <Route path='/encode'>
            <div className="w-full max-w-7xl mx-auto">
              <EncodePage />
            </div>
          </Route>
          <Route path='/decode'>
            <div className="w-full max-w-7xl mx-auto">
              <DecodePage />
            </div>
          </Route>
          <Route path='/about'>
            <div className="w-full max-w-7xl mx-auto">
              <AboutPage />
            </div>
          </Route>
        </Switch>
        <Footer />
      </Router>
    </div>
  );
}

export default App;