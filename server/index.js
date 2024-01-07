import express from 'express';


const app = express()

const PORT = 4040

app.listen(PORT,()=>{
    console.log(`server listening at ${PORT}`);
})