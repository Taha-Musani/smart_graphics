import React from 'react'
import "./login.css"

const Login = () => {

    console.log(process.env.REACT_APP_BACKEND_URL);
    const loginwithgoogle = (e)=>{
        
        window.open(`${process.env.REACT_APP_BACKEND_URL}/auth/google/callback`,"_self")
    }
  return (
    <>
        <div className="login-page">
            <h1 style={{textAlign:"center"}}>Login</h1>
            <div className="form">
                <button className='login-with-google-btn' onClick={loginwithgoogle}>
                    Sign In With Google
                </button>
            </div>
        </div>
    </>
  )
}

export default Login