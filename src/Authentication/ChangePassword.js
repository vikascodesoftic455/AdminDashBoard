import React, { Component, useEffect, useState} from "react";
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


console.log(config.ApiUrl,"vgyids")


// const abc =()=>{
//     alert("hello")
// }

const Login =(props)=>{
  const [changePassword,setchangePassword] =useState({
    oldPassword:"",
    newPassword:"",
    confirmNewpassword:""
  })
  let history =useHistory()
  console.log(localStorage.getItem("token"))
  const handler =(event)=>{
    const {id , value} = event.target 
    setchangePassword(prevState=>({
      ...prevState,
      [id]:value
    }))
  }
  const handleValidSubmit= async()=>{
      console.log("show")
     const config={
        headers:{
            'Accept': 'application/json',
           'Content-Type': 'application/json',
             Authorization:`Bearer ${localStorage.getItem("token")}`
        }
    }
    try{
        console.log(config,"egywdf")
         await 
             axios
                .get('http://localhost:5000/changepassword',config)
                    .then(res => {
                        console.log(res)
                    })
                    .catch(err => {
                        console.error(err); 
                    })
    }catch(err){
        console.log(err)
    }
}

   useEffect(()=>{
      if(!localStorage.getItem("token")){
          history.push(`${config.authicateUrl}/login`)
      }
      
      handleValidSubmit()
   },[])
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
                          ChangePassword
                        </h5>
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
                              name="oldPassword"
                              label="Old-Password"
                              className="form-control"
                              value={changePassword.oldPassword}
                              placeholder="Please enter the oldpasswword"
                              autoComplete="off"
                              type="password"
                              required
                              onChange={handler}
                            />
                          </div>
                          <div className="form-group">
                            <AvField
                              name="newPassword"
                              label="New-Password"
                              type="password"
                              required
                              placeholder="Please enter New Password"
                              value={changePassword.newPassword}
                              placeholder="Enter Password"
                              onChange={handler}
                            />
                          </div>

                          <div className="form-group">
                            <AvField
                              name="confirmNewpassword"
                              label="Confirm-Password"
                              className="form-control"
                              value={changePassword.confirmNewpassword}
                              placeholder="Retype-your password"
                              autoComplete="off"
                              type="password"
                              required
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
                                 changePassword
                              </button>
                            </Col>
                          </Row>
                        </AvForm>
                      </div>
                    </CardBody>
                  </Card>
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
