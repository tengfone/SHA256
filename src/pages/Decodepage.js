import React, { useState } from "react";

function Decodepage() {
    const [text, setText] = useState("");
    const [decodeText, setDecodeText] = useState("")
    const [copied, setCopied] = useState(false)

    const copyToDevice = () => {
        setCopied(true)
        navigator.clipboard.writeText(decodeText)
        setTimeout(function () {
            setCopied(false)
        }, 1500)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (setText) {
            // TODO: Get API Key from https://md5decrypt.net/en/Api/
        }
        else {
            setText('')
        }
    }

    return (
        <div>
            <div className="flex flex-row flex-wrap py-10 justify-center">
                <div className="px-4 py-3 rounded-lg xl:w-7/12 shadow p-4 flex">
                    <span className="w-auto flex justify-end items-center text-grey p-2">
                        <i className="material-icons text-3xl">lock_open</i>
                    </span>
                    <form className="w-full inline-flex" onSubmit={handleSubmit}>
                        <input id='decodeText' name='decodeText' onChange={(e) => setText(e.target.value)} type="text" className="w-full rounded p-2" placeholder="Place Encrypted SHA256 Here" />
                        <button type="submit" className="bg-red-300 hover:bg-red-100 rounded text-white p-2 pl-4 pr-4">
                            <p className="font-semibold text-xl">Decode</p>
                        </button>
                    </form>
                </div>
            </div>
            <div className="flex flex-row flex-wrap py-5 justify-center">
                <div className="w-auto block text-sm text-blue-600 bg-blue-200 border border-blue-400 flex items-center p-4 rounded-lg" role="alert">
                    <span className="mr-1">
                        <svg className="fill-current text-blue-500 inline-block h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <path className="heroicon-ui" d="M15 19a3 3 0 0 1-6 0H4a1 1 0 0 1 0-2h1v-6a7 7 0 0 1 4.02-6.34 3 3 0 0 1 5.96 0A7 7 0 0 1 19 11v6h1a1 1 0 0 1 0 2h-5zm-4 0a1 1 0 0 0 2 0h-2zm0-12.9A5 5 0 0 0 7 11v6h10v-6a5 5 0 0 0-4-4.9V5a1 1 0 0 0-2 0v1.1z" />
                        </svg>
                    </span>
                    <span>
                        <strong className="mr-1">Holy Sh...t!</strong> Something seriously bad happened.. Please go <a className="font-extrabold" rel="noopener noreferrer" href="https://md5decrypt.net/en/Sha256/" target="_blank">here</a> instead for the decryption.
          </span>
                </div>
            </div>
            {decodeText && (
                <div className="flex flex-row flex-wrap py-10 justify-center">
                    <div className="shadow items-center px-4 py-3 text-green-700 bg-green-100 rounded-lg xl:w-7/12 flex" role="alert">
                        <div className="w-5/6">
                            <p className="font-bold">Encrypted Message</p>
                            <p className="break-all">{decodeText}</p>
                        </div>
                        <div className="w-1/6">
                            <button onClick={copyToDevice} type="submit" className="material-icons p-6 xl:p-1 xl:pl-16">
                                content_paste
                        </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-row flex-wrap py-1 justify-center">
                <div className="relative xl:w-7/12 px-4 py-3 leading-normal text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="absolute inset-y-0 left-0 flex items-center ml-4">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </span>
                    <p className="ml-6">API Limit Exceeded</p>
                </div>
            </div>
        </div>
    )
}

export default Decodepage
