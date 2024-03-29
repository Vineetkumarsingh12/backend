import { toast } from "react-hot-toast";
import { studentEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import rzpLogo from "../../assets/Logo/Logo-Full-Dark.png"
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart } from "../../slices/cartSlice";


const {COURSE_PAYMENT_API, COURSE_VERIFY_API, SEND_PAYMENT_SUCCESS_EMAIL_API} = studentEndpoints;


function loadScript(src) {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;

        script.onload = () => {
            console.log("resolve");
            resolve(true);
        }
        script.onerror= () =>{
            console.log("reject");
            resolve(false);
        }
        document.body.appendChild(script);
    })
}

//verify payment
async function verifyPayment(bodyData, token, navigate, dispatch) {
    const toastId = toast.loading("Verifying Payment....");
    dispatch(setPaymentLoading(true));
    try{
        const response  = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
            Authorization:`Bearer ${token}`,
        })

        if(!response.data.success) {
            throw new Error(response.data.message);
        }
        toast.success("payment Successful, ypou are addded to the course");
        navigate("/dashboard/enrolled-courses");
        dispatch(resetCart());
    }   
    catch(error) {
        console.log("PAYMENT VERIFY ERROR....", error);
        toast.error("Could not verify Payment");
    }
    toast.dismiss(toastId);
    dispatch(setPaymentLoading(false));
}


async function sendPaymentSuccessEmail(response, amount, token) {
    try{
        await apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            amount,
        },{
            Authorization: `Bearer ${token}`
        })
    }
    catch(error) {
        console.log("PAYMENT SUCCESS EMAIL ERROR....", error);
    }
}

export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
  
    const toastId = toast.loading("Loading...");
    console.log("userDetails");
    console.log(userDetails);
    try{
        //load the script
        console.log("paymentS0");
        const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        console.log("paymentS1");
        if(!res) {
            toast.error("RazorPay SDK failed to load");
            return;
        }
        console.log("paymentS2");
        //initiate the order
        console.log(COURSE_PAYMENT_API);
        console.log(courses);
        const orderResponse = await apiConnector("POST", COURSE_PAYMENT_API, 
        {courses},
        {
            Authorization:`Bearer ${token}`,
        })
        
  console.log("paymentS3");
  console.log("order",orderResponse.data.success);

        if(!orderResponse.data.success) {
            throw new Error(orderResponse.data.message);
        }
        console.log("PRINTING orderResponse", orderResponse);
        console.log("PRINTING currency", orderResponse.data.data.currency);
        //options
        const options = {
            "key": process.env.REACT_APP_RAZORPAY_KEY,
            "currency": orderResponse.data.data.currency,
            "amount": `${orderResponse.data.data.amount}`,
            "order_id":orderResponse.data.data.id,
            "name":"SmartLearnHub",
            "description": "Thank You for Purchasing the Course",
            "image":rzpLogo,
            "prefill": {
                "name":`${userDetails.firstName}`,
                "email":`${userDetails.email}`,
            
            },
            "theme": {
                "color": "#3399cc"
            },
            "handler": function(response) {
               
                //send successful wala mail
                sendPaymentSuccessEmail(response, orderResponse.data.data.amount,token );
                //verifyPayment
                verifyPayment({...response, courses}, token, navigate, dispatch);
            }
        }
       
        console.log("payment window");
        //miss hogya tha 
        // console.log(options.)
        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        console.log("successS4");
        console.log(paymentObject);
        paymentObject.on("payment.failed", function(response) {
            console.log("respon",response)
            toast.error("oops, payment failed");
            console.log("payment api error",response.error);
        })

    }
    catch(error) {
        console.log('error',error);
        console.log("PAYMENT API ERROR.....", error);
        toast.error("Could not make Payment");
    }
    toast.dismiss(toastId);
}



