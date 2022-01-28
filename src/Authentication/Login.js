import React, { Component, useState} from "react";
import config from '../../BaseUrl'
import { Row, Col, Card, CardBody, Alert } from "reactstrap";
import { useHistory } from "react-router-dom";
import axios from 'axios'
// Redux
import { connect } from "react-redux";
import { withRouter, Link } from "react-router-dom";

// availity-reactstrap-validation
import { AvForm, AvField } from "availity-reactstrap-validation";

import Loader from "../../components/Loader";
// actions
import { loginUser } from "../../store/actions";

// import images
import logoSm from "../../assets/images/logo-sm.png";


// const abc =()=>{
//     alert("hello")
// }

const Login =(props)=>{
  console.log(props.error,"deepak")
  const [admindetails,setadmindetails] =useState({email:'',password:''})
  let history =useHistory()
  const handler =(event)=>{
    const {id , value} = event.target 
    setadmindetails(prevState=>({
      ...prevState,
      [id]:value
    }))
  }
  const handleValidSubmit =(event)=>{
       axios
           .post(
            `${config.ApiUrl}/login`,
               admindetails
            )
              .then(Response=>{
                  console.log(Response.data.statuscode)
                  if(Response.data.statuscode===202){
                    const message =Response.data.message
                    alert(message)
                    window.localStorage.setItem("token",Response.data.token);
                    history.push(`${config.authicateUrl}/dashboard`)
                  }
              })
            
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
                  {/* {this.props.loading ? <Loader /> : null} */}

                  <Card className="overflow-hidden">
                    <div className="bg-primary">
                      <div className="text-primary text-center p-4">
                        <h5 className="text-white font-size-20">
                          Welcome Back !
                        </h5>
                        <p className="text-white-50">
                          Sign in to continue to Veltrix.
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
                          {/* {this.props.error ? (
                            <Alert color="danger">{this.props.error}</Alert>
                          ) : null} */}

                          <div className="form-group">
                            <AvField
                              name="email"
                              label="Email"
                              className="form-control"
                              value={admindetails.email}
                              placeholder="Enter email"
                              autoComplete="off"
                              type="email"
                              required
                              onChange={handler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="password"
                              label="Password"
                              type="password"
                              required
                              value={admindetails.password}
                              placeholder="Enter Password"
                              onChange={handler}
                            />
                          </div>

                          <Row className="form-group">
                            <Col sm={6}>
                              &nbsp;
                              {/* <div className="custom-control custom-checkbox">
                                                            <input type="checkbox" className="custom-control-input" id="customControlInline" />
                                                            <label className="custom-control-label" for="customControlInline">Remember me</label>
                                                        </div> */}
                            </Col>
                            <Col sm={6} className="text-right">
                              <button
                                className="btn btn-primary w-md waves-effect waves-light"
                                type="submit"
                              >
                                Log In
                              </button>
                            </Col>
                          </Row>
                          <Row className="form-group mt-2 mb-0">
                            <div className="col-12 mt-4">
                              <Link to="/forget-password">
                                <i className="mdi mdi-lock"></i> Forgot your
                                password?
                              </Link>
                            </div>
                          </Row>
                        </AvForm>
                      </div>
                    </CardBody>
                  </Card>
                </div>
                <div className="mt-5 text-center">
                  <p>
                    Don't have an account ?{" "}
                    <Link
                      to="pages-register"
                      className="font-weight-medium text-primary"
                    >
                      {" "}
                      Signup now{" "}
                    </Link>{" "}
                  </p>
                  <p className="mb-0">
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
  const { error, loading } = state.Login;
  return { error, loading };
};

export default withRouter(connect(mapStatetoProps, { loginUser })(Login));
