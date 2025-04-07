import React from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const NavigationBar = () => {
    const location = useLocation();

    return (
        <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
            <Container>
                <Navbar.Brand as={Link} to="/Roh_Analysis">Ray of Hope Dashboard</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link
                            as={Link}
                            to="/comparison"
                            active={location.pathname === '/comparison'}
                        >
                            Platform Comparison
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;