import express, { json } from "express";
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const app = express()
const PORT = 8000

app.get("/", (req, res) => {
  res.send({status : "working"})
})

app.get(`/auth`, (req, res) => {
  main(req, res)
  return
})

const generateAspNetSessionData = async () => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, withCredentials: true }));
  const response = await client.get('https://ums.lpu.in/lpuums/LoginNew.aspx');
  const cookies = await jar.getCookies('https://ums.lpu.in/');
  const sessionCookie = cookies.find(c => c.key === 'ASP.NET_SessionId');
  
  const htmlString = response.data;
  const dom = new JSDOM(htmlString);
  const doc = dom.window.document;
  
  const viewState = doc.querySelector('input[name="__VIEWSTATE"]')?.value;
  const eventValidation = doc.querySelector('input[name="__EVENTVALIDATION"]')?.value;
  
  return {
    sessionId: sessionCookie?.value,
    viewState,
    eventValidation
  };
}

async function main(req, res) {
  try {
    let getData = (req.query.data === "true");
    const sessionData = await generateAspNetSessionData();
    const setSession = await axios.post(
      'https://ums.lpu.in/lpuums/LoginNew.aspx',
      new URLSearchParams({
        '__LASTFOCUS': '',
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__VIEWSTATE': sessionData.viewState,
        '__VIEWSTATEGENERATOR': 'DD46A77E',
        '__SCROLLPOSITIONX': '0',
        '__SCROLLPOSITIONY': '0',
        '__EVENTVALIDATION': sessionData.eventValidation,
        'DropDownList1': '1',
        'txtU': req.query.regno,  
        'TxtpwdAutoId_8767': req.query.pass,
        'iBtnLogins150203125': 'Login'
      }),
      {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'max-age=0',
          'Connection': 'keep-alive',
          'Origin': 'https://ums.lpu.in',
          'Referer': 'https://ums.lpu.in/lpuums/LoginNew.aspx',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Cookie': `ASP.NET_SessionId=${sessionData.sessionId}`
        }
      }
    );
    const sessionDoc = new JSDOM(setSession.data);
    if (sessionDoc.window.document.getElementById("TxtpwdAutoId_8767")){
      console.log("Wrong credentials")
      res.send({error: "Wrong credentials"})
    } else{
      console.log("Logged in")
      if (!getData){
        res.send({status: "Logged in"})
      }
      if (getData){
        const extractDetails = await axios.get('https://ums.lpu.in/lpuums/frmStudentProfileUpdate.aspx', {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Referer': 'https://ums.lpu.in/lpuums/default3.aspx',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Cookie': `ASP.NET_SessionId=${sessionData.sessionId}; ${req.query.regno}=Y`
          }
        });
        
        let data = {}
        const doc = new JSDOM(extractDetails.data).window.document;
        const inputs = [
          "ctl00_cphHeading_TxtName",
          "ctl00_cphHeading_TxtGender",
          "ctl00_cphHeading_txtDOB",
          "ctl00_cphHeading_txtEmailId",
        ];
  
        inputs.forEach(id => {
          data[id] = doc.getElementById(id).getAttribute("value");
        });

        res.send({data})
      }

      const removeSession = await axios.get('https://ums.lpu.in/lpuums/RemoveSession.aspx', {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Referer': 'https://ums.lpu.in/lpuums/frmStudentProfileUpdate.aspx',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Cookie': `ASP.NET_SessionId=${sessionData.sessionId}; ${req.query.regno}=Y`
        }
      });

      if (removeSession.status == 200) {
        console.log("Session removed")
      }
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

app.listen(PORT)