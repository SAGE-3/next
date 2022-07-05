
import asyncio
from jupyter_client import AsyncKernelManager
from jupyter_client import KernelManager, AsyncKernelManager
def start_new_kernel(startup_timeout=60, kernel_name='python', **kwargs):
    """Start a new kernel, and return its Manager and Client"""
    km = KernelManager()
    km.start_kernel()
    kc = km.client()
    kc.start_channels()
    try:
        kc.wait_for_ready(timeout=startup_timeout)
    except RuntimeError:
        kc.stop_channels()
        km.shutdown_kernel()
        raise

    return km, kc

async def start_new_async_kernel(startup_timeout=60, kernel_name='python', **kwargs):
    """Start a new kernel, and return its Manager and Client"""
    km = AsyncKernelManager(kernel_name=kernel_name)
    await km.start_kernel(**kwargs)
    kc = km.client()
    kc.start_channels()
    try:
        await kc.wait_for_ready(timeout=startup_timeout)
    except RuntimeError:
        kc.stop_channels()
        await km.shutdown_kernel()
        raise
    return (km, kc)

async def main():
    new_async_kernel_task = asyncio.create_task(start_new_async_kernel())
    km, kc = await new_async_kernel_task
    while True:
        print("connected")
        # kc.execute("1+1")
        # out = await kc.get_shell_msg(timeout=1)
        # await asyncio.sleep(5)
        # out = await kc.get_iopub_msg(timeout=1)
        # print(out)

    kc.stop_channels()
    await km.shutdown_kernel()

if __name__ == "__main__":
    asyncio.run(main())