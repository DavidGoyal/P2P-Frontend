import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const URL = import.meta.env.VITE_BACKEND_URL;

const Room = ({
	name,
	localAudioTrack,
	localVideoTrack,
}: {
	name: string;
	localAudioTrack: MediaStreamTrack;
	localVideoTrack: MediaStreamTrack;
}) => {
	const [, setSocket] = useState<Socket | null>(null);
	const [lobby, setLobby] = useState(true);
	const [, setSendingPC] = useState<RTCPeerConnection | null>(null);
	const [, setReceivingPC] = useState<RTCPeerConnection | null>(null);
	const [, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
	const [, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
	const [, setRemoteMediaStream] = useState<MediaStream | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
	const localVideoRef = useRef<HTMLVideoElement | null>(null);

	useEffect(() => {
		const socket = io(URL);
		setSocket(socket);

		socket.on("send-offer", async ({ roomID }) => {
			setLobby(false);

			const pc = new RTCPeerConnection();
			setSendingPC(pc);

			pc.addTrack(localAudioTrack);
			pc.addTrack(localVideoTrack);

			pc.onnegotiationneeded = async () => {
				const sdp = await pc.createOffer();
				pc.setLocalDescription(sdp);
				socket.emit("offer", {
					sdp,
					roomID,
				});
			};

			pc.onicecandidate = async ({ candidate }) => {
				if (candidate) {
					socket.emit("add-ice-candidate", {
						candidate,
						roomID,
						type: "sender",
					});
				}
			};
		});

		socket.on("offer", async ({ sdp, roomID }) => {
			setLobby(false);

			const pc = new RTCPeerConnection();
			setReceivingPC(pc);
			pc.setRemoteDescription(sdp);

			const stream = new MediaStream();
			if (remoteVideoRef.current) {
				remoteVideoRef.current.srcObject = stream;
			}

			setRemoteMediaStream(stream);

			const answer = await pc.createAnswer();
			pc.setLocalDescription(answer);
			socket.emit("answer", {
				sdp: answer,
				roomID,
			});

			pc.onicecandidate = async ({ candidate }) => {
				if (candidate) {
					socket.emit("add-ice-candidate", {
						candidate,
						roomID,
						type: "receiver",
					});
				}
			};
			//@ts-ignore
			window.pcr = pc;

			setTimeout(() => {
				const track1 = pc.getTransceivers()[0].receiver.track;
				const track2 = pc.getTransceivers()[1].receiver.track;
				console.log(track1);
				if (track1.kind === "video") {
					setRemoteAudioTrack(track2);
					setRemoteVideoTrack(track1);
				} else {
					setRemoteAudioTrack(track1);
					setRemoteVideoTrack(track2);
				}
				//@ts-ignore
				remoteVideoRef.current.srcObject.addTrack(track1);
				//@ts-ignore
				remoteVideoRef.current.srcObject.addTrack(track2);
				//@ts-ignore
				remoteVideoRef.current.play();
			}, 5000);
		});

		socket.on("answer", ({ sdp }) => {
			setLobby(false);

			setSendingPC((pc) => {
				if (!pc) {
					return null;
				}
				pc.setRemoteDescription(sdp);
				return pc;
			});
		});

		socket.on("add-ice-candidate", ({ candidate, type }) => {
			if (type === "sender") {
				setReceivingPC((pc) => {
					if (!pc) {
						return null;
					}
					pc.addIceCandidate(candidate);
					return pc;
				});
			} else {
				setSendingPC((pc) => {
					if (!pc) {
						return null;
					}
					pc.addIceCandidate(candidate);
					return pc;
				});
			}
		});
	}, [name]);

	useEffect(() => {
		if (localVideoRef.current) {
			localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
			localVideoRef.current.play();
		}
	}, [localVideoRef]);

	if (lobby) {
		return (
			<div>
				Waiting for you to connect to someone
				<video width={400} height={400} ref={localVideoRef} />
			</div>
		);
	}

	return (
		<div>
			Hi {name}
			<video autoPlay width={400} height={400} ref={localVideoRef} />
			your
			<video autoPlay width={400} height={400} ref={remoteVideoRef} />
		</div>
	);
};

export default Room;
