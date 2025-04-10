import React from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const NavigationBar = () => {
    const location = useLocation();

    return (
        <Navbar
            className="mb-4"
            style={{
                backgroundColor: '#E6F2FF',
                fontFamily: 'Inter, Arial, sans-serif',
                color: '#1a1a1a',
                borderBottom: '1px solid #1a1a1a'
            }}
        >
            <Container>
                <div className="d-flex align-items-center gap-4">
                    <Navbar.Brand
                        as={Link}
                        to="/RoH_Analysis"
                        className="d-flex align-items-center m-0"
                        style={{
                            fontWeight: 600,
                            color: '#1A1A1A',
                            fontSize: '1.4rem'
                        }}
                    >
                        <img
                            src={`${process.env.PUBLIC_URL}/RoH_logo.png`}
                            width="45"
                            height="30"
                            className="d-inline-block align-top me-2"
                            alt="Ray of Hope Logo"
                        />
                        <span>Dashboard</span>
                    </Navbar.Brand>

                    <Nav className="d-flex align-items-center">
                        <Nav.Link
                            as={Link}
                            to="/comparison"
                            active={location.pathname === '/comparison'}
                            style={{
                                color: location.pathname === '/comparison' ? '#1A1A1A' : '#6c757d',
                                fontWeight: 500,
                                fontSize: '1rem',
                                opacity: location.pathname === '/comparison' ? 1 : 0.8
                            }}
                        >
                            Platform Comparison
                        </Nav.Link>
                    </Nav>
                </div>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;
