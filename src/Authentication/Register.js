import React, { Component, useState } from "react";
import { Row, Col, Card, CardBody, Alert } from "reactstrap";
import axios from 'axios'
// availity-reactstrap-validation
import { AvForm, AvField } from "availity-reactstrap-validation";

import Loader from "../../components/Loader";
// action
import { registerUser, loginUser } from "../../store/actions";

// Redux
import { connect } from "react-redux";
import { Link, useHistory } from "react-router-dom";

// import images
import logoSm from "../../assets/images/logo-sm.png";

const  Register =() =>{
        
    const [admindata,setAdmindata]=useState({
      name:"",
      email:"",
      username:"",
      PhoneNumber:"",
      Password:"",
      PasswordCofirm:""
    })
    let history =useHistory()

    const inputhandler=(event)=>{
      const {id , value} = event.target 
      setAdmindata(prevState=>({
        ...prevState,
        [id]:value
      }))
    }

   const handleValidSubmit =()=>{
       const {name,email,username,PhoneNumber,password,confirmPassword}=admindata
         if(name && email &&username &&PhoneNumber &&(password===confirmPassword)){
                  axios
                   .post(   
                       'http://localhost:6700/pages-register',
                        admindata
                      )
                      .then(Response=>{
                          console.log(Response.data)
                           if(Response.data.status==="sucess"){
                                const message =Response.data.message
                                alert(message)
                                history.push('http://localhost:3000/login')
                           }else if(Response.data.status==="Accepted"){
                               const message =Response.data.message
                                alert(message)
                           }
                      })
                  
         }else{
                alert('Invalid user')
         } 
   }
  
    return (
      <React.Fragment>
        <div className="home-btn d-none d-sm-block">
          <Link to="/" className="text-dark">
            <i className="fas fa-home h2"></i>
          </Link>
        </div>
        <div className="account-pages my-5 pt-5">
          <div className="container">
            <Row className="justify-content-center">
              <Col md={8} lg={6} xl={5}>
                <div className="position-relative">

                  <Card className="overflow-hidden">
                    <div className="bg-primary">
                      <div className="text-primary text-center p-4">
                        <h5 className="text-white font-size-20">
                          Free Register
                        </h5>
                        <p className="text-white-50">
                          Get your free Veltrix account now.
                        </p>
                        <Link to="/" className="logo logo-admin">
                          <img src={logoSm} height="24" alt="logo" />
                        </Link>
                      </div>
                    </div>
                    <CardBody className="p-4">
                      <div className="p-3">
                        <AvForm
                          className="form-horizontal mt-4"
                          onValidSubmit={handleValidSubmit}
                        >
                          {/* {this.props.user && this.props.user ? (
                            <Alert color="success">
                              Register User Successfully
                            </Alert>
                          ) : null}
                          {this.props.registrationError &&
                          this.props.registrationError ? (
                            <Alert color="danger">
                              {this.props.registrationError}
                            </Alert>
                          ) : null} */}
                            
                            <div className="form-group">
                            <AvField
                              name="name"
                              label="Name"
                              className="form-control"
                              placeholder="Enter your Name"
                              type="text"
                              required
                              onChange={inputhandler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="email"
                              label="Email"
                              className="form-control"
                              placeholder="Enter email"
                              type="email"
                              required
                              onChange={inputhandler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="username"
                              label="Username"
                              type="text"
                              required
                              placeholder="Enter username"
                              onChange={inputhandler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="PhoneNumber"
                              label="Phone Number"
                              type="number"
                              required
                              placeholder="Enter Phone Number"
                              onChange={inputhandler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="Password"
                              label="Password"
                              type="password"
                              required
                              placeholder="Enter Password"
                              onChange={inputhandler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="PasswordCofirm"
                              label="Retype_Password"
                              type="password"
                              required
                              placeholder="Enter Password"
                              onChange={inputhandler}
                            />
                          </div>

                          <Row className="form-group">
                            <div className="col-12 text-right">
                              <button
                                className="btn btn-primary w-md waves-effect waves-light"
                                type="submit"
                              >
                                Register
                              </button>
                            </div>
                          </Row>
                          <Row className="form-group mt-2 mb-0">
                            <div className="col-12 mt-4">
                              <p className="mb-0">
                                By registering you agree to the Veltrix{" "}
                                <Link to="#" className="text-primary">
                                  Terms of Use
                                </Link>
                              </p>
                            </div>
                          </Row>
                        </AvForm>
                      </div>
                    </CardBody>
                  </Card>
                </div>
                <div className="mt-5 text-center">
                  <p>
                    Already have an account ?{" "}
                    <Link
                      to="pages-login"
                      className="font-weight-medium text-primary"
                    >
                      {" "}
                      Login{" "}
                    </Link>{" "}
                  </p>
                  <p>
                    © {new Date().getFullYear()} Veltrix. Crafted with{" "}
                    <i className="mdi mdi-heart text-danger"></i> by Themesbrand
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </React.Fragment>
    );
  }

const mapStatetoProps = state => {
  const { user, registrationError, loading } = state.Account;
  return { user, registrationError, loading };
};

export default connect(mapStatetoProps, { registerUser, loginUser })(Register);
